use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, RwLock};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use ringbuf::traits::{Consumer, Producer, Split};
use ringbuf::HeapRb;

use super::dsp::DspChain;
use super::types::{AudioSettings, AudioStatus};

pub struct SendStream(pub cpal::Stream);
unsafe impl Send for SendStream {}

pub struct AudioController {
    input_stream: Option<SendStream>,
    output_stream: Option<SendStream>,
    settings: Arc<RwLock<AudioSettings>>,
    current_level_db_bits: Arc<AtomicU32>,
    is_active: bool,
    sample_rate: u32,
}

impl AudioController {
    pub fn new() -> Self {
        Self {
            input_stream: None,
            output_stream: None,
            settings: Arc::new(RwLock::new(AudioSettings::default())),
            current_level_db_bits: Arc::new(AtomicU32::new((-60.0f32).to_bits())),
            is_active: false,
            sample_rate: 48000,
        }
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }

    pub fn get_level_db(&self) -> f32 {
        f32::from_bits(self.current_level_db_bits.load(Ordering::Relaxed))
    }

    pub fn get_status(&self) -> AudioStatus {
        AudioStatus {
            is_active: self.is_active,
            sample_rate: self.sample_rate,
            current_level_db: self.get_level_db(),
        }
    }

    pub fn get_input_devices(&self) -> Vec<String> {
        let host = cpal::default_host();
        let mut devices = Vec::new();
        if let Ok(input_devices) = host.input_devices() {
            for device in input_devices {
                if let Ok(name) = device.name() {
                    devices.push(name);
                }
            }
        }
        devices
    }

    pub fn update_settings(&mut self, new_settings: AudioSettings) {
        if let Ok(mut lock) = self.settings.write() {
            *lock = new_settings;
        }
    }

    pub fn start(&mut self, device_name: Option<String>, initial_settings: AudioSettings) -> Result<(), String> {
        if self.is_active {
            self.stop();
        }

        self.update_settings(initial_settings);

        let host = cpal::default_host();

        // 1. Find input device
        let input_device = if let Some(ref name) = device_name {
            host.input_devices()
                .map_err(|e| e.to_string())?
                .find(|d| d.name().map(|n| n == *name).unwrap_or(false))
                .or_else(|| host.default_input_device())
        } else {
            host.default_input_device()
        }
        .ok_or_else(|| "No input device available".to_string())?;

        // 2. Find default output device (Headphones / Speakers)
        let output_device = host
            .default_output_device()
            .ok_or_else(|| "No output device available".to_string())?;

        let input_config = input_device
            .default_input_config()
            .map_err(|e| format!("Default input config error: {}", e))?;
        let output_config = output_device
            .default_output_config()
            .map_err(|e| format!("Default output config error: {}", e))?;

        let sample_rate = output_config.sample_rate().0;
        self.sample_rate = sample_rate;

        // Create lock-free ring buffer (2048 samples capacity ~42ms buffer to handle any jitter)
        let rb = HeapRb::<f32>::new(2048);
        let (mut producer, mut consumer) = rb.split();

        // Shared telemetry and DSP settings
        let settings_clone = Arc::clone(&self.settings);
        let level_bits_clone = Arc::clone(&self.current_level_db_bits);

        // 3. Build Input Stream
        let input_channels = input_config.channels() as usize;
        let err_fn = |err| eprintln!("Input stream error: {}", err);

        let input_stream = input_device
            .build_input_stream(
                &input_config.into(),
                move |data: &[f32], _: &_| {
                    if input_channels == 1 {
                        for &sample in data {
                            let _ = producer.try_push(sample);
                        }
                    } else {
                        // Downmix to mono for singing DSP
                        for frame in data.chunks(input_channels) {
                            let mono: f32 = frame.iter().sum::<f32>() / (input_channels as f32);
                            let _ = producer.try_push(mono);
                        }
                    }
                },
                err_fn,
                None,
            )
            .map_err(|e| format!("Failed to build input stream: {}", e))?;

        // 4. Build Output Stream with real-time DSP
        let output_channels = output_config.channels() as usize;
        let mut dsp = DspChain::new(sample_rate as f32);
        let mut rms_sum = 0.0f32;
        let mut rms_count = 0;

        let output_stream = output_device
            .build_output_stream(
                &output_config.into(),
                move |data: &mut [f32], _: &_| {
                    // Update DSP parameters lock-free
                    if let Ok(s) = settings_clone.try_read() {
                        dsp.mic_gain = s.mic_gain;
                        dsp.is_muted = s.is_muted;
                        dsp.reverb_mix = match s.reverb_preset.as_str() {
                            "dry" => 0.0,
                            _ => s.reverb_mix,
                        };
                        match s.reverb_preset.as_str() {
                            "room" => dsp.reverb.set_decay(1.0),
                            "hall" => dsp.reverb.set_decay(2.8),
                            _ => {}
                        }
                        let echo_norm = (s.echo_percent / 100.0).clamp(0.0, 1.0);
                        dsp.delay_mix = echo_norm * 0.5;
                        dsp.delay.feedback = echo_norm * 0.45;
                        dsp.set_tone(s.tone_db);
                    }

                    for frame in data.chunks_mut(output_channels) {
                        let raw_in = consumer.try_pop().unwrap_or(0.0);
                        let processed = dsp.process_sample(raw_in);

                        // Accumulate RMS for level meter
                        rms_sum += processed * processed;
                        rms_count += 1;

                        for channel in frame.iter_mut() {
                            *channel = processed;
                        }
                    }

                    // Update level meter every ~1000 samples
                    if rms_count >= 1024 {
                        let rms = (rms_sum / (rms_count as f32)).sqrt();
                        let db = if rms > 0.0001 {
                            (20.0 * rms.log10()).max(-60.0)
                        } else {
                            -60.0
                        };
                        level_bits_clone.store(db.to_bits(), Ordering::Relaxed);
                        rms_sum = 0.0;
                        rms_count = 0;
                    }
                },
                |err| eprintln!("Output stream error: {}", err),
                None,
            )
            .map_err(|e| format!("Failed to build output stream: {}", e))?;

        input_stream
            .play()
            .map_err(|e| format!("Failed to play input stream: {}", e))?;
        output_stream
            .play()
            .map_err(|e| format!("Failed to play output stream: {}", e))?;

        self.input_stream = Some(SendStream(input_stream));
        self.output_stream = Some(SendStream(output_stream));
        self.is_active = true;

        Ok(())
    }

    pub fn stop(&mut self) {
        if let Some(SendStream(stream)) = self.input_stream.take() {
            let _ = stream.pause();
        }
        if let Some(SendStream(stream)) = self.output_stream.take() {
            let _ = stream.pause();
        }
        self.current_level_db_bits.store((-60.0f32).to_bits(), Ordering::Relaxed);
        self.is_active = false;
    }
}
