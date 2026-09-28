// Pure Rust Audio DSP Pipeline
use std::f32::consts::PI;

/// Second-order biquad IIR filter (Direct Form I)
#[derive(Clone)]
pub struct BiquadFilter {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}

impl BiquadFilter {
    pub fn highpass(cutoff_hz: f32, sample_rate: f32, q: f32) -> Self {
        let omega = 2.0 * PI * cutoff_hz / sample_rate;
        let alpha = omega.sin() / (2.0 * q);
        let cos_w = omega.cos();

        let b0 = (1.0 + cos_w) / 2.0;
        let b1 = -(1.0 + cos_w);
        let b2 = (1.0 + cos_w) / 2.0;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_w;
        let a2 = 1.0 - alpha;

        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    pub fn highshelf(freq_hz: f32, sample_rate: f32, gain_db: f32) -> Self {
        let a = 10.0f32.powf(gain_db / 40.0);
        let omega = 2.0 * PI * freq_hz / sample_rate;
        let sin_w = omega.sin();
        let cos_w = omega.cos();
        let beta = (a + a).sqrt();

        let b0 = a * ((a + 1.0) + (a - 1.0) * cos_w + beta * sin_w);
        let b1 = -2.0 * a * ((a - 1.0) + (a + 1.0) * cos_w);
        let b2 = a * ((a + 1.0) + (a - 1.0) * cos_w - beta * sin_w);
        let a0 = (a + 1.0) - (a - 1.0) * cos_w + beta * sin_w;
        let a1 = 2.0 * ((a - 1.0) - (a + 1.0) * cos_w);
        let a2 = (a + 1.0) - (a - 1.0) * cos_w - beta * sin_w;

        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    pub fn process(&mut self, input: f32) -> f32 {
        let out = self.b0 * input + self.b1 * self.x1 + self.b2 * self.x2
            - self.a1 * self.y1
            - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = input;
        self.y2 = self.y1;
        self.y1 = out;
        out
    }
}

/// Fast brickwall safety limiter
pub struct Limiter {
    envelope: f32,
    release_coeff: f32,
    threshold: f32,
}

impl Limiter {
    pub fn new(sample_rate: f32, threshold_db: f32) -> Self {
        let release_time = 0.080; // 80ms release

        Self {
            envelope: 0.0,
            release_coeff: (-1.0 / (release_time * sample_rate)).exp(),
            threshold: 10.0f32.powf(threshold_db / 20.0),
        }
    }

    pub fn process(&mut self, sample: f32) -> f32 {
        let abs_val = sample.abs();
        if abs_val > self.envelope {
            // Instant peak attack for true brickwall protection
            self.envelope = abs_val;
        } else {
            self.envelope = self.release_coeff * self.envelope + (1.0 - self.release_coeff) * abs_val;
        }

        let gain = if self.envelope > self.threshold {
            self.threshold / self.envelope
        } else {
            1.0
        };

        (sample * gain).clamp(-0.95, 0.95)
    }
}

/// Circular delay line for feedback echo
pub struct DelayLine {
    buffer: Vec<f32>,
    write_idx: usize,
    delay_samples: usize,
    pub feedback: f32,
    filter_state: f32,
    alpha: f32,
}

impl DelayLine {
    pub fn new(max_delay_samples: usize, delay_samples: usize, sample_rate: f32) -> Self {
        // 2800 Hz lowpass damping filter
        let dt = 1.0 / sample_rate;
        let rc = 1.0 / (2.0 * PI * 2800.0);
        let alpha = dt / (rc + dt);

        Self {
            buffer: vec![0.0; max_delay_samples],
            write_idx: 0,
            delay_samples: delay_samples.min(max_delay_samples - 1),
            feedback: 0.3,
            filter_state: 0.0,
            alpha,
        }
    }

    pub fn set_delay(&mut self, samples: usize) {
        self.delay_samples = samples.min(self.buffer.len() - 1);
    }

    pub fn process(&mut self, input: f32) -> f32 {
        let len = self.buffer.len();
        let read_idx = (self.write_idx + len - self.delay_samples) % len;
        let delayed = self.buffer[read_idx];

        // Apply low-pass damping to feedback
        self.filter_state += self.alpha * (delayed - self.filter_state);
        let feedback_sample = self.filter_state * self.feedback.clamp(0.0, 0.7);

        self.buffer[self.write_idx] = input + feedback_sample;
        self.write_idx = (self.write_idx + 1) % len;

        delayed
    }
}

/// Comb filter for Schroeder reverb
struct CombFilter {
    buffer: Vec<f32>,
    idx: usize,
    feedback: f32,
    damp_state: f32,
}

impl CombFilter {
    fn new(delay_samples: usize, feedback: f32) -> Self {
        Self {
            buffer: vec![0.0; delay_samples],
            idx: 0,
            feedback,
            damp_state: 0.0,
        }
    }

    fn process(&mut self, input: f32) -> f32 {
        let output = self.buffer[self.idx];
        self.damp_state = output * 0.4 + self.damp_state * 0.6;
        self.buffer[self.idx] = input + self.damp_state * self.feedback;
        self.idx = (self.idx + 1) % self.buffer.len();
        output
    }
}

/// All-pass filter for Schroeder reverb
struct AllpassFilter {
    buffer: Vec<f32>,
    idx: usize,
    feedback: f32,
}

impl AllpassFilter {
    fn new(delay_samples: usize, feedback: f32) -> Self {
        Self {
            buffer: vec![0.0; delay_samples],
            idx: 0,
            feedback,
        }
    }

    fn process(&mut self, input: f32) -> f32 {
        let buf_out = self.buffer[self.idx];
        let output = -input + buf_out;
        self.buffer[self.idx] = input + buf_out * self.feedback;
        self.idx = (self.idx + 1) % self.buffer.len();
        output
    }
}

/// Schroeder algorithmic reverb network
pub struct SchroederReverb {
    combs: Vec<CombFilter>,
    allpasses: Vec<AllpassFilter>,
    pub decay: f32,
}

impl SchroederReverb {
    pub fn new(sample_rate: f32) -> Self {
        let scale = sample_rate / 44100.0;
        let comb_lengths = [
            (1116.0 * scale) as usize,
            (1188.0 * scale) as usize,
            (1277.0 * scale) as usize,
            (1356.0 * scale) as usize,
        ];

        let allpass_lengths = [(225.0 * scale) as usize, (341.0 * scale) as usize];

        let combs = comb_lengths
            .iter()
            .map(|&len| CombFilter::new(len, 0.78))
            .collect();

        let allpasses = allpass_lengths
            .iter()
            .map(|&len| AllpassFilter::new(len, 0.5))
            .collect();

        Self {
            combs,
            allpasses,
            decay: 1.8,
        }
    }

    pub fn set_decay(&mut self, decay: f32) {
        self.decay = decay.clamp(0.2, 4.0);
        let fb = 0.5 + (self.decay / 4.0) * 0.42; // scale feedback 0.5 -> 0.92
        for comb in &mut self.combs {
            comb.feedback = fb;
        }
    }

    pub fn process(&mut self, input: f32) -> f32 {
        let mut sum = 0.0;
        for comb in &mut self.combs {
            sum += comb.process(input);
        }
        sum *= 0.25;

        for ap in &mut self.allpasses {
            sum = ap.process(sum);
        }

        sum
    }
}

/// Master DSP chain combining all elements
pub struct DspChain {
    pub highpass: BiquadFilter,
    pub limiter: Limiter,
    pub reverb: SchroederReverb,
    pub delay: DelayLine,
    pub tone_filter: BiquadFilter,
    pub sample_rate: f32,

    pub mic_gain: f32,
    pub is_muted: bool,
    pub reverb_mix: f32,
    pub delay_mix: f32,
    pub tone_db: f32,
}

impl DspChain {
    pub fn new(sample_rate: f32) -> Self {
        let max_delay = (sample_rate * 0.8) as usize; // max 800ms
        let initial_delay = (sample_rate * 0.18) as usize; // 180ms

        Self {
            highpass: BiquadFilter::highpass(80.0, sample_rate, 0.707),
            limiter: Limiter::new(sample_rate, -6.0),
            reverb: SchroederReverb::new(sample_rate),
            delay: DelayLine::new(max_delay, initial_delay, sample_rate),
            tone_filter: BiquadFilter::highshelf(3500.0, sample_rate, 0.0),
            sample_rate,

            mic_gain: 1.0,
            is_muted: false,
            reverb_mix: 0.35,
            delay_mix: 0.20,
            tone_db: 0.0,
        }
    }

    pub fn set_tone(&mut self, gain_db: f32) {
        self.tone_db = gain_db.clamp(-6.0, 6.0);
        self.tone_filter = BiquadFilter::highshelf(3500.0, self.sample_rate, self.tone_db);
    }

    pub fn process_sample(&mut self, input: f32) -> f32 {
        if self.is_muted {
            return 0.0;
        }

        // 1. High-Pass filter (80Hz rumble cut)
        let filtered = self.highpass.process(input);

        // 2. Pre-amp Mic Gain
        let gained = filtered * self.mic_gain;

        // 3. Safety Limiter (-6dB brickwall)
        let limited = self.limiter.process(gained);

        // 4. Parallel Effects: Dry + Reverb + Echo
        let dry = limited;
        let rev_out = if self.reverb_mix > 0.001 {
            self.reverb.process(limited) * self.reverb_mix
        } else {
            0.0
        };

        let delay_out = if self.delay_mix > 0.001 {
            self.delay.process(limited) * self.delay_mix
        } else {
            0.0
        };

        let summed = dry + rev_out + delay_out;

        // 5. Tone EQ filter
        let tone_shaped = self.tone_filter.process(summed);

        // Final safety limiter clamp to prevent any output clipping
        self.limiter.process(tone_shaped)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_highpass_attenuates_sub_bass() {
        let mut dsp = DspChain::new(48000.0);
        let sample_rate = 48000.0;
        let mut sub_bass_energy = 0.0;
        let mut vocal_energy = 0.0;

        for i in 0..4800 {
            let t = i as f32 / sample_rate;
            let sub = (2.0 * PI * 20.0 * t).sin();
            let vocal = (2.0 * PI * 1000.0 * t).sin();

            let out_sub = dsp.process_sample(sub);
            let out_vocal = dsp.process_sample(vocal);

            if i > 2400 {
                sub_bass_energy += out_sub * out_sub;
                vocal_energy += out_vocal * out_vocal;
            }
        }

        // Highpass filter at 80Hz must significantly attenuate 20Hz compared to 1000Hz
        assert!(vocal_energy > sub_bass_energy * 2.0);
    }

    #[test]
    fn test_limiter_clamps_loud_signals() {
        let mut dsp = DspChain::new(48000.0);
        dsp.mic_gain = 5.0; // excessive gain

        let mut max_output = 0.0f32;
        for i in 0..4800 {
            let t = i as f32 / 48000.0;
            let loud_input = (2.0 * PI * 440.0 * t).sin() * 2.0;
            let out = dsp.process_sample(loud_input);
            if out.abs() > max_output {
                max_output = out.abs();
            }
        }

        // Limiter must clamp output under 1.0 (0 dBFS ceiling)
        assert!(max_output <= 0.95);
    }

    #[test]
    fn test_mute_zeroes_signal() {
        let mut dsp = DspChain::new(48000.0);
        dsp.is_muted = true;
        let out = dsp.process_sample(0.8);
        assert_eq!(out, 0.0);
    }

    #[test]
    fn test_reverb_diffuses_energy() {
        let mut reverb = SchroederReverb::new(48000.0);
        reverb.set_decay(2.0);

        // Send a single impulse spike
        let mut impulse_response = Vec::new();
        impulse_response.push(reverb.process(1.0));
        for _ in 0..2000 {
            impulse_response.push(reverb.process(0.0));
        }

        // Reverb tail must sustain into subsequent reflection frames
        let tail_energy: f32 = impulse_response[1200..2000].iter().map(|&x| x * x).sum();
        assert!(tail_energy > 0.001);
    }
}
