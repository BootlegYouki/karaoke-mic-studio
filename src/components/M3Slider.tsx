interface M3SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueDisplay?: string;
  icon?: React.ReactNode;
  onChange: (value: number) => void;
}

export function M3Slider({
  label,
  value,
  min,
  max,
  step = 0.05,
  valueDisplay,
  icon,
  onChange,
}: M3SliderProps) {
  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="flex flex-col gap-1.5 select-none">
      {/* Label and Value Badge */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-zinc-300 flex items-center gap-1.5">
          {icon && <span className="text-zinc-400">{icon}</span>}
          {label}
        </span>
        {valueDisplay && (
          <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded-full bg-zinc-800/80">
            {valueDisplay}
          </span>
        )}
      </div>

      {/* Material 3 Pill Slider Track */}
      <div className="relative h-7 flex items-center">
        {/* Visual Pill Track */}
        <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden relative">
          <div
            className="h-full bg-sky-300 rounded-full transition-all duration-75"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Visual Pill Thumb */}
        <div
          className="absolute w-4 h-4 rounded-full bg-sky-200 shadow-sm pointer-events-none -ml-2 transition-all duration-75"
          style={{ left: `${percent}%` }}
        />

        {/* Accessible Range Input */}
        <input
          type="range"
          role="slider"
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
export default M3Slider;
