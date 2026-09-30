import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Mic } from 'lucide-react';

interface DeviceMenuProps {
  devices: string[];
  selectedDevice: string | null;
  onSelect: (device: string | null) => void;
  icon?: React.ReactNode;
  defaultLabel?: string;
}

export function DeviceMenu({
  devices,
  selectedDevice,
  onSelect,
  icon,
  defaultLabel = 'Default System Microphone',
}: DeviceMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLabel = selectedDevice || defaultLabel;

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {/* MD3 Outlined Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full bg-[#111318] hover:bg-[#16181f] border border-zinc-700/60 focus:border-sky-400 rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-xs text-[#e2e2e9] transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2 truncate">
          {icon || <Mic className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          <span className="truncate">{currentLabel}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-300' : ''
          }`}
        />
      </button>

      {/* MD3 Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-[#1e2025] border border-zinc-700/80 rounded-2xl p-1.5 shadow-2xl max-h-52 overflow-y-auto flex flex-col gap-0.5">
          {/* Default Option */}
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setIsOpen(false);
            }}
            className={`w-full py-2 px-3 rounded-xl text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
              !selectedDevice
                ? 'bg-sky-950 text-sky-200 font-semibold'
                : 'text-zinc-300 hover:bg-[#282a30] hover:text-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {icon || <Mic className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
              <span className="truncate">{defaultLabel}</span>
            </div>
            {!selectedDevice && <Check className="w-3.5 h-3.5 text-sky-300 shrink-0" />}
          </button>

          {/* List of hardware devices */}
          {devices.map((name) => {
            const isSelected = selectedDevice === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onSelect(name);
                  setIsOpen(false);
                }}
                className={`w-full py-2 px-3 rounded-xl text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950 text-sky-200 font-semibold'
                    : 'text-zinc-300 hover:bg-[#282a30] hover:text-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {icon || <Mic className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                  <span className="truncate">{name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-sky-300 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default DeviceMenu;
