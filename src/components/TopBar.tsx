import { Mic, Headphones, Power, ExternalLink } from 'lucide-react';

interface TopBarProps {
  isActive: boolean;
  onToggle: () => void;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
}

export function TopBar({
  isActive,
  onToggle,
  devices,
  selectedDeviceId,
  onDeviceChange,
}: TopBarProps) {
  const handlePopout = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      window.open(
        chrome.runtime.getURL('index.html'),
        'KaraokeMicWindow',
        'width=380,height=620,status=no,menubar=no,toolbar=no'
      );
    } else {
      window.open('index.html', '_blank', 'width=380,height=620');
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-3">
      {/* Title & Master Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-cyan-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
                Karaoke Mic Studio
              </h1>
              <button
                type="button"
                onClick={handlePopout}
                title="Pop out floating window (keeps running anywhere)"
                aria-label="Pop out floating window"
                className="text-zinc-500 hover:text-cyan-400 p-0.5 rounded transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
              <Headphones className="w-3 h-3 text-cyan-500/80" />
              <span>Headphones Recommended</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-label={isActive ? 'Stop Monitor' : 'Start Monitor'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
            isActive
              ? 'bg-cyan-500 text-zinc-950 shadow-sm shadow-cyan-500/20 font-semibold'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/80'
          }`}
        >
          <Power className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
          <span>{isActive ? 'MONITOR ON' : 'START MIC'}</span>
        </button>
      </div>

      {/* Mic Input Device Selector */}
      <div className="space-y-1">
        <label
          htmlFor="mic-device-select"
          className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400"
        >
          Input Audio Device
        </label>
        <select
          id="mic-device-select"
          value={selectedDeviceId}
          onChange={(e) => onDeviceChange(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-sans focus:outline-none focus:border-cyan-500/60 transition-colors"
        >
          {devices.length === 0 ? (
            <option value="">Default Microphone</option>
          ) : (
            devices.map((d, index) => (
              <option key={d.deviceId || index} value={d.deviceId}>
                {d.label || `Microphone ${index + 1}`}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
export default TopBar;
