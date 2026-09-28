import { useRef, useEffect, useState } from 'react';
import { Activity, Waves } from 'lucide-react';

interface VisualizerProps {
  analyser?: AnalyserNode | null;
  streamData?: number[] | null;
  isActive: boolean;
}

export function Visualizer({ analyser, streamData, isActive }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const meterBarRef = useRef<HTMLDivElement | null>(null);
  const dbTextRef = useRef<HTMLSpanElement | null>(null);
  const [mode, setMode] = useState<'wave' | 'bars'>('wave');

  // Handle local AnalyserNode (direct mode)
  useEffect(() => {
    if (!isActive || (!analyser && !streamData)) {
      if (meterBarRef.current) meterBarRef.current.style.width = '0%';
      if (dbTextRef.current) {
        dbTextRef.current.textContent = '-∞';
        dbTextRef.current.className = 'text-zinc-300 font-mono';
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let peakDb = -60;

    const render = (timeData: Uint8Array | number[]) => {
      const bufferLength = timeData.length;
      let sumSquares = 0;
      let peak = 0;

      for (let i = 0; i < bufferLength; i++) {
        const norm = (timeData[i] - 128) / 128;
        sumSquares += norm * norm;
        const absVal = Math.abs(norm);
        if (absVal > peak) peak = absVal;
      }

      const rms = Math.sqrt(sumSquares / bufferLength);
      const currentDb = rms > 0.0001 ? Math.max(-60, 20 * Math.log10(rms)) : -60;
      peakDb = Math.max(currentDb, peakDb - 1.2);
      const isClipping = peak >= 0.95;

      const meterPercent = Math.min(100, Math.max(0, ((peakDb + 60) / 60) * 100));
      if (meterBarRef.current) {
        meterBarRef.current.style.width = `${meterPercent}%`;
        meterBarRef.current.className = `h-full transition-all duration-75 ${
          isClipping ? 'bg-rose-500' : peakDb > -12 ? 'bg-amber-400' : 'bg-emerald-500'
        }`;
      }

      if (dbTextRef.current) {
        dbTextRef.current.textContent = peakDb <= -59.5 ? '-∞' : `${peakDb.toFixed(1)} dB`;
        dbTextRef.current.className = isClipping ? 'text-rose-400 font-bold' : 'text-zinc-300';
      }

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (mode === 'wave') {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#06b6d4';
        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else {
        const barCount = 28;
        const barWidth = width / barCount - 2;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const val = Math.abs(timeData[i * step] - 128) / 128;
          const barHeight = val * (height - 4);
          const x = i * (barWidth + 2);
          const y = height - barHeight;
          ctx.fillStyle = val > 0.8 ? '#f43f5e' : val > 0.5 ? '#f59e0b' : '#06b6d4';
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }
    };

    if (analyser) {
      const bufferLength = analyser.frequencyBinCount;
      const localTimeData = new Uint8Array(bufferLength);
      const frameLoop = () => {
        animationId = requestAnimationFrame(frameLoop);
        analyser.getByteTimeDomainData(localTimeData);
        render(localTimeData);
      };
      frameLoop();
      return () => cancelAnimationFrame(animationId);
    } else if (streamData && streamData.length > 0) {
      render(streamData);
    }
  }, [isActive, analyser, streamData, mode]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isActive ? 'bg-cyan-500 animate-pulse' : 'bg-zinc-700'
            }`}
          />
          <span className="font-semibold uppercase tracking-wider text-zinc-300">
            {isActive ? 'LIVE MONITOR' : 'STANDBY'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('wave')}
            className={`p-1 rounded transition-colors ${
              mode === 'wave'
                ? 'bg-zinc-800 text-cyan-400 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Waveform"
          >
            <Waves className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMode('bars')}
            className={`p-1 rounded transition-colors ${
              mode === 'bars'
                ? 'bg-zinc-800 text-cyan-400 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Spectrum"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Visualizer Canvas */}
      <div className="relative bg-zinc-950 border border-zinc-800/80 rounded overflow-hidden h-20 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          data-testid="visualizer-canvas"
          width={360}
          height={80}
          className="w-full h-full block"
        />
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-zinc-600 tracking-widest uppercase">
            Standby / Mic Inactive
          </div>
        )}
      </div>

      {/* Segmented Peak VU Meter */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-500">VU LEVEL</span>
          <span ref={dbTextRef} className="text-zinc-300">
            -∞
          </span>
        </div>

        <div className="h-2 bg-zinc-950 rounded-sm border border-zinc-800 overflow-hidden flex">
          <div
            ref={meterBarRef}
            className="h-full transition-all duration-75 bg-emerald-500"
            style={{ width: '0%' }}
          />
        </div>

        <div className="flex justify-between text-[9px] font-mono text-zinc-600 px-0.5">
          <span>-60</span>
          <span>-24</span>
          <span>-12</span>
          <span>-6</span>
          <span>0 dB</span>
        </div>
      </div>
    </div>
  );
}
export default Visualizer;
