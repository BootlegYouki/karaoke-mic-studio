import { Sparkles, Sliders, AudioLines } from 'lucide-react';
import { KaraokeSettings, ReverbPresetName } from '../audio/types';
import { REVERB_PRESETS } from '../audio/ReverbGenerator';

interface EffectsRackProps {
  settings: KaraokeSettings;
  onUpdateSettings: (updates: Partial<KaraokeSettings>) => void;
}

export function EffectsRack({ settings, onUpdateSettings }: EffectsRackProps) {
  const presets: { id: ReverbPresetName; label: string }[] = [
    { id: 'dry', label: REVERB_PRESETS.dry.name },
    { id: 'room', label: REVERB_PRESETS.room.name },
    { id: 'club', label: REVERB_PRESETS.club.name },
    { id: 'hall', label: REVERB_PRESETS.hall.name },
  ];

  const handlePresetSelect = (preset: ReverbPresetName) => {
    const config = REVERB_PRESETS[preset];
    onUpdateSettings({
      reverbPreset: preset,
      reverbMix: config.mix,
      reverbDecay: config.decaySeconds,
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-4">
      <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
        <span>Studio Effects Rack</span>
      </div>

      {/* 1. Reverb Section */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded p-2.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="font-medium">Vocal Reverb</span>
          </div>
          <span className="text-zinc-400">
            {Math.round(settings.reverbMix * 100)}% Mix
          </span>
        </div>

        {/* Preset Selector Chips */}
        <div className="grid grid-cols-4 gap-1">
          {presets.map((p) => {
            const isSelected = settings.reverbPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetSelect(p.id)}
                className={`py-1 px-1.5 rounded text-[11px] font-mono tracking-tight transition-colors text-center truncate ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-medium'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Reverb Mix & Decay Sliders */}
        <div className="space-y-2 pt-1">
          <div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
              <span>Wet Mix</span>
              <span>{Math.round(settings.reverbMix * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.reverbMix}
              onChange={(e) => onUpdateSettings({ reverbMix: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
              <span>Decay Time</span>
              <span>{settings.reverbDecay.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="4.0"
              step="0.1"
              value={settings.reverbDecay}
              onChange={(e) => onUpdateSettings({ reverbDecay: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. Karaoke Echo / Delay Section */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded p-2.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <AudioLines className="w-3 h-3 text-cyan-400" />
            <span className="font-medium">Karaoke Echo</span>
          </div>
          <span className="text-zinc-400">
            {Math.round(settings.delayTime * 1000)} ms
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
              <span>Echo Delay Time</span>
              <span>{Math.round(settings.delayTime * 1000)} ms</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.01"
              value={settings.delayTime}
              onChange={(e) => onUpdateSettings({ delayTime: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
              <span>Repeats (Feedback)</span>
              <span>{Math.round(settings.delayFeedback * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.65"
              step="0.05"
              value={settings.delayFeedback}
              onChange={(e) => onUpdateSettings({ delayFeedback: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
              <span>Echo Level (Mix)</span>
              <span>{Math.round(settings.delayMix * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={settings.delayMix}
              onChange={(e) => onUpdateSettings({ delayMix: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. Vocal Clarity EQ */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded p-2.5 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-medium text-zinc-300">Vocal Tone (Clarity)</span>
          <span className="text-zinc-400">
            {settings.toneClarity > 0 ? `+${settings.toneClarity}` : settings.toneClarity} dB
          </span>
        </div>
        <input
          type="range"
          min="-6"
          max="6"
          step="0.5"
          value={settings.toneClarity}
          onChange={(e) => onUpdateSettings({ toneClarity: parseFloat(e.target.value) })}
          className="w-full accent-cyan-500 bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[9px] font-mono text-zinc-600">
          <span>-6 dB (Warm)</span>
          <span>0 dB</span>
          <span>+6 dB (Airy)</span>
        </div>
      </div>
    </div>
  );
}
export default EffectsRack;
