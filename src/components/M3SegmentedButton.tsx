interface SegmentOption {
  id: string;
  label: string;
}

interface M3SegmentedButtonProps {
  options: SegmentOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function M3SegmentedButton({ options, selectedId, onSelect }: M3SegmentedButtonProps) {
  return (
    <div className="flex w-full p-1 rounded-full bg-zinc-900/90 border border-zinc-800 gap-1">
      {options.map((opt) => {
        const isSelected = opt.id === selectedId;
        return (
          <button
            key={opt.id}
            type="button"
            role="button"
            onClick={() => onSelect(opt.id)}
            className={`flex-1 py-1.5 px-3 rounded-full text-xs transition-all text-center cursor-pointer ${
              isSelected
                ? 'bg-sky-950 text-sky-200 font-semibold border border-sky-400/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
export default M3SegmentedButton;
