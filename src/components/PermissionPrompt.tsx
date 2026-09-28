import { ShieldAlert, ExternalLink } from 'lucide-react';

interface PermissionPromptProps {
  error: string | null;
  onRetry: () => void;
}

export function openPermissionTab(): void {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    chrome.tabs.create({ url: chrome.runtime.getURL('permission.html') });
  } else {
    window.open('permission.html', '_blank');
  }
}

export function PermissionPrompt({ error, onRetry }: PermissionPromptProps) {
  const handleAllowClick = () => {
    openPermissionTab();
    onRetry();
  };

  return (
    <div className="bg-zinc-900 border border-amber-500/40 rounded-lg p-3.5 space-y-3 shadow-lg">
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-zinc-100">
            Microphone Access Required
          </h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Chrome blocks permission dialogs inside Side Panels. Click below to open a one-time tab and click <strong>Allow</strong>.
          </p>
          {error && (
            <div className="text-[10px] font-mono text-amber-400/90 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
              Status: {error}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleAllowClick}
        aria-label="Allow Microphone Access"
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-mono font-semibold transition-colors cursor-pointer"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>Open Permission Tab</span>
      </button>
    </div>
  );
}
export default PermissionPrompt;
