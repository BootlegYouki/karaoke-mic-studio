import { Sparkles, AudioLines, Sliders } from 'lucide-react';
import { KaraokeSettings, ReverbPresetName } from '../audio/types';

interface EffectsRackProps {
  settings: KaraokeSettings;
  onUpdateSettings: (updates: Partial<KaraokeSettings>) => void;
}

export function EffectsRack({ settings, onUpdateSettings }: EffectsRackProps) {
  const presets: { id: ReverbPresetName; label: string; decay: number }[] = [
    { id: 'dry', label: 'Dry', decay: 0.1 },
    { id: 'room', label: 'Room', decay: 1.0 },
    { id: 'hall', label: 'Hall', decay: 2.8 },
  ];

  const handlePresetSelect = (preset: ReverbPresetName, decay: number) => {
    onUpdateSettings({
      reverbPreset: preset,
      reverbDecay: decay,
      reverbMix: preset === 'dry' ? 0 : Math.max(0.2, settings.reverbMix),
    });
  };

  // Convert single 0-100% echo slider into balanced delay parameters
  const handleEchoChange = (echoPercent: number) => {
    const norm = echoPercent / 100;
    onUpdateSettings({
      delayMix: norm * 0.5,             // Up to 50% wet mix
      delayFeedback: norm * 0.45,        // Up to 45% feedback
      delayTime: 0.18,                   // 180ms classic karaoke tempo
    });
  };

  const currentEchoPercent = Math.round((settings.delayMix / 0.5) * 100);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-3">
      {/* 1. Reverb Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium uppercase tracking-wider text-[11px]">Reverb</span>
          </div>
          <span className="text-zinc-400 font-mono text-[11px]">
            {settings.reverbPreset === 'dry' ? 'Off' : `${Math.round(settings.reverbMix * 100)}%`}
          </span>
        </div>

        {/* 3 Simple Preset Chips */}
        <div className="grid grid-cols-3 gap-1.5">
          {presets.map((p) => {
            const isSelected = settings.reverbPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetSelect(p.id, p.decay)}
                className={`py-1.5 px-2 rounded text-xs font-mono transition-colors text-center cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 font-semibold'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Reverb Amount Slider */}
        {settings.reverbPreset !== 'dry' && (
          <div className="pt-1">
            <input
              aria-label="Reverb Amount"
              type="range"
              min="0.05"
              max="0.8"
              step="0.05"
              value={settings.reverbMix}
              onChange={(e) => onUpdateSettings({ reverbMix: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800/80 pt-2.5 space-y-2">
        {/* 2. Karaoke Echo Slider */}
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <AudioLines className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium uppercase tracking-wider text-[11px]">Echo</span>
          </div>
          <span className="text-zinc-400 font-mono text-[11px]">
            {currentEchoPercent <= 0 ? 'Off' : `${currentEchoPercent}%`}
          </span>
        </div>
        <input
          aria-label="Echo Amount"
          type="range"
          min="0"
          max="100"
          step="5"
          value={currentEchoPercent}
          onChange={(e) => handleEchoChange(parseInt(e.target.value, 10))}
          className="w-full accent-cyan-500 bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="border-t border-zinc-800/80 pt-2.5 space-y-2">
        {/* 3. Vocal Tone (Warm vs Bright) */}
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium uppercase tracking-wider text-[11px]">Vocal Tone</span>
          </div>
          <span className="text-zinc-400 font-mono text-[11px]">
            {settings.toneClarity === 0
              ? 'Neutral'
              : settings.toneClarity > 0
              ? `Bright (+${settings.toneClarity})`
              : `Warm (${settings.toneClarity})`}
          </span>
        </div>
        <input
          aria-label="Vocal Tone"
          type="range"
          min="-6"
          max="6"
          step="1"
          value={settings.toneClarity}
          onChange={(e) => onUpdateSettings({ toneClarity: parseFloat(e.target.value) })}
          className="w-full accent-cyan-500 bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[9px] font-mono text-zinc-600 px-0.5">
          <span>Warm</span>
          <span>Neutral</span>
          <span>Bright</span>
        </div>
      </div>
    </div>
  );
}
export default EffectsRack;
