interface AudioMeterProps {
  levelDb: number;
  isActive: boolean;
}

export function AudioMeter({ levelDb, isActive }: AudioMeterProps) {
  const isClipping = levelDb > -2.0;
  const isQuiet = levelDb <= -59.5 || !isActive;
  const meterPercent = isQuiet
    ? 0
    : Math.min(100, Math.max(0, ((levelDb + 60) / 60) * 100));

  const displayDb = isQuiet ? '-∞ dB' : `${levelDb.toFixed(1)} dB`;

  return (
    <div className="flex flex-col gap-1.5 py-1 select-none">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400 font-medium">Input Signal</span>
        <span className={`text-[11px] font-mono ${isClipping ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>
          {displayDb}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={meterPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-75 ${
            isClipping
              ? 'bg-rose-400'
              : levelDb > -12
              ? 'bg-amber-300'
              : 'bg-sky-300'
          }`}
          style={{ width: `${meterPercent}%` }}
        />
      </div>
    </div>
  );
}
export default AudioMeter;
