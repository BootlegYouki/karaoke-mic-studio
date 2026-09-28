import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface PermissionPromptProps {
  error: string | null;
  onRetry: () => void;
}

export function PermissionPrompt({ error, onRetry }: PermissionPromptProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-zinc-100">
            Microphone Access Required
          </h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Chrome requires microphone permissions to route your singing voice to your headphones.
            Please grant mic access in your browser prompt or site permissions.
          </p>
          {error && (
            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
              Error: {error}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono font-medium hover:bg-zinc-700 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
        <span>Allow Microphone Access</span>
      </button>
    </div>
  );
}
export default PermissionPrompt;
