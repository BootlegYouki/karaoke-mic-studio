import { Volume2, Mic, MicOff, RotateCcw } from 'lucide-react';

interface MasterControlsProps {
  micGain: number;
  isMuted: boolean;
  onGainChange: (gain: number) => void;
  onToggleMute: () => void;
  onReset: () => void;
}

export function MasterControls({
  micGain,
  isMuted,
  onGainChange,
  onToggleMute,
  onReset,
}: MasterControlsProps) {
  // Convert gain factor to dB: 1.0 -> 0dB, 2.0 -> +6dB, 0.5 -> -6dB
  const gainDb = micGain > 0 ? (20 * Math.log10(micGain)).toFixed(1) : '-∞';
  const gainPercent = Math.round(micGain * 100);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-zinc-400 uppercase tracking-wider font-semibold">
          Vocal Level
        </span>
        <span className="text-zinc-300">
          {gainPercent}% <span className="text-zinc-500 font-mono">({gainDb} dB)</span>
        </span>
      </div>

      {/* Main Gain Slider */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            id="mic-volume-slider"
            aria-label="Mic Volume"
            type="range"
            min="0"
            max="2.5"
            step="0.05"
            value={micGain}
            onChange={(e) => onGainChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-zinc-600 px-1">
          <span>0%</span>
          <span>100% (Unity)</span>
          <span>250%</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-mono font-medium transition-colors ${
            isMuted
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700'
          }`}
        >
          {isMuted ? (
            <>
              <MicOff className="w-3.5 h-3.5 text-rose-400" />
              <span>MUTED [Space]</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-zinc-400" />
              <span>MUTE [Space]</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onReset}
          aria-label="Reset Effects"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-mono text-zinc-400 bg-zinc-800/80 border border-zinc-700/80 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
          <span>RESET FX</span>
        </button>
      </div>
    </div>
  );
}
export default MasterControls;
