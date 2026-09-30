import { useEffect } from 'react';
import { Mic, MicOff, Power, Headphones, Volume2 } from 'lucide-react';
import { useTauriAudio } from './hooks/useTauriAudio';
import { M3Slider } from './components/M3Slider';
import { M3SegmentedButton } from './components/M3SegmentedButton';
import { AudioMeter } from './components/AudioMeter';
import { DeviceMenu } from './components/DeviceMenu';

export function App() {
  const {
    settings,
    status,
    devices,
    outputDevices,
    error,
    startMic,
    stopMic,
    updateSettings,
  } = useTauriAudio();

  // Spacebar quick-mute shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLSelectElement ||
          e.target instanceof HTMLButtonElement
        )
      ) {
        e.preventDefault();
        updateSettings({ is_muted: !settings.is_muted });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.is_muted, updateSettings]);

  const handleToggle = () => {
    if (status.is_active) {
      stopMic();
    } else {
      startMic(
        settings.device_name || undefined,
        settings.output_device_name || undefined
      );
    }
  };

  const reverbOptions = [
    { id: 'dry', label: 'Dry' },
    { id: 'room', label: 'Room' },
    { id: 'hall', label: 'Hall' },
  ];

  return (
    <main className="min-h-screen bg-[#111318] text-[#e2e2e9] p-4 flex flex-col gap-3.5 max-w-sm mx-auto select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#1d2024] flex items-center justify-center text-sky-300">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-[#e2e2e9]">
              Karaoke Mic Studio
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <Headphones className="w-3 h-3 text-sky-300/80" />
              <span>Headphones Recommended</span>
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert if any */}
      {error && (
        <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Master Action: Large MD3 Pill Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full py-3.5 px-6 rounded-full font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
          status.is_active
            ? 'bg-sky-950 text-sky-200 border border-sky-400/50 hover:bg-sky-900/60'
            : 'bg-sky-300 text-[#042f65] hover:bg-sky-200 shadow-md'
        }`}
      >
        <Power className={`w-4 h-4 ${status.is_active ? 'text-sky-300' : 'text-[#042f65]'}`} />
        <span>{status.is_active ? 'MONITOR ACTIVE (CLICK TO STOP)' : 'START MICROPHONE'}</span>
      </button>

      {/* Audio Level Meter */}
      <div className="p-3 rounded-2xl bg-[#1d2024]">
        <AudioMeter levelDb={status.current_level_db} isActive={status.is_active} />
      </div>

      {/* Microphone Device Selection */}
      <div className="p-3.5 rounded-3xl bg-[#1d2024] flex flex-col gap-2">
        <span className="text-xs font-medium text-zinc-400">
          Audio Input Device
        </span>
        <DeviceMenu
          devices={devices}
          selectedDevice={settings.device_name}
          onSelect={(val) => {
            updateSettings({ device_name: val });
            if (status.is_active) {
              startMic(
                val || undefined,
                settings.output_device_name || undefined
              );
            }
          }}
        />
      </div>

      {/* Speaker / Output Device Selection */}
      <div className="p-3.5 rounded-3xl bg-[#1d2024] flex flex-col gap-2">
        <span className="text-xs font-medium text-zinc-400">
          Audio Output Device (Speakers / Headphones)
        </span>
        <DeviceMenu
          devices={outputDevices}
          selectedDevice={settings.output_device_name}
          icon={<Volume2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          defaultLabel="Default System Speaker / Output"
          onSelect={(val) => {
            updateSettings({ output_device_name: val });
            if (status.is_active) {
              startMic(
                settings.device_name || undefined,
                val || undefined
              );
            }
          }}
        />
      </div>

      {/* Volume & Quick Mute */}
      <div className="p-3.5 rounded-3xl bg-[#1d2024] flex flex-col gap-3">
        <M3Slider
          label="Microphone Volume"
          value={settings.mic_gain}
          min={0}
          max={2.5}
          step={0.05}
          valueDisplay={`${Math.round(settings.mic_gain * 100)}%`}
          onChange={(val) => updateSettings({ mic_gain: val })}
        />

        <button
          type="button"
          onClick={() => updateSettings({ is_muted: !settings.is_muted })}
          className={`py-2 px-4 rounded-full text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
            settings.is_muted
              ? 'bg-rose-950 text-rose-200 border border-rose-500/40'
              : 'bg-[#282a2f] text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          {settings.is_muted ? (
            <>
              <MicOff className="w-3.5 h-3.5 text-rose-400" />
              <span>Muted [Space]</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-zinc-400" />
              <span>Mute Microphone [Space]</span>
            </>
          )}
        </button>
      </div>

      {/* Vocal Effects */}
      <div className="p-3.5 rounded-3xl bg-[#1d2024] flex flex-col gap-3.5">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-zinc-300">Vocal Reverb</span>
          <M3SegmentedButton
            options={reverbOptions}
            selectedId={settings.reverb_preset}
            onSelect={(id) => updateSettings({ reverb_preset: id })}
          />
          {settings.reverb_preset !== 'dry' && (
            <M3Slider
              label="Reverb Level"
              value={settings.reverb_mix}
              min={0.05}
              max={0.8}
              step={0.05}
              valueDisplay={`${Math.round(settings.reverb_mix * 100)}%`}
              onChange={(val) => updateSettings({ reverb_mix: val })}
            />
          )}
        </div>

        <div className="pt-1 border-t border-zinc-800/80">
          <M3Slider
            label="Karaoke Echo"
            value={settings.echo_percent}
            min={0}
            max={100}
            step={5}
            valueDisplay={settings.echo_percent <= 0 ? 'Off' : `${settings.echo_percent}%`}
            onChange={(val) => updateSettings({ echo_percent: val })}
          />
        </div>

        <div className="pt-1 border-t border-zinc-800/80">
          <M3Slider
            label="Vocal Tone"
            value={settings.tone_db}
            min={-6}
            max={6}
            step={1}
            valueDisplay={
              settings.tone_db === 0
                ? 'Neutral'
                : settings.tone_db > 0
                ? `Bright (+${settings.tone_db})`
                : `Warm (${settings.tone_db})`
            }
            onChange={(val) => updateSettings({ tone_db: val })}
          />
        </div>
      </div>

      {/* Desktop Tray Footer */}
      <footer className="text-center text-[10px] text-zinc-500 py-1 font-sans">
        Minimizing window keeps audio running in System Tray
      </footer>
    </main>
  );
}
export default App;
