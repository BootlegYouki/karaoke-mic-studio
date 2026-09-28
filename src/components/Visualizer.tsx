import { useRef, useEffect, useState } from 'react';
import { Activity, Waves } from 'lucide-react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
}

export function Visualizer({ analyser, isActive }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<'wave' | 'bars'>('wave');
  const [peakDb, setPeakDb] = useState<number>(-60);
  const [isClipping, setIsClipping] = useState<boolean>(false);

  useEffect(() => {
    if (!isActive || !analyser) {
      setPeakDb(-60);
      setIsClipping(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bufferLength = analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);

    const renderFrame = () => {
      animationId = requestAnimationFrame(renderFrame);

      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(freqData);

      // Compute RMS and peak in dB
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
      setPeakDb((prev) => Math.max(currentDb, prev - 1.5)); // smooth meter release
      setIsClipping(peak >= 0.95);

      // Clear Canvas
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Draw subtle hardware grid background
      ctx.strokeStyle = '#27272a'; // zinc-800
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Center horizontal line
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (mode === 'wave') {
        // Draw Oscilloscope Waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#06b6d4'; // cyan-500
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else {
        // Draw Frequency Spectrum Bars
        const barCount = 32;
        const barWidth = (width / barCount) - 2;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const val = freqData[i * step] / 255;
          const barHeight = val * (height - 4);
          const x = i * (barWidth + 2);
          const y = height - barHeight;

          // Gradient color: Cyan to Emerald
          ctx.fillStyle = val > 0.85 ? '#f43f5e' : val > 0.6 ? '#f59e0b' : '#06b6d4';
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, analyser, mode]);

  // Convert dB (-60 to 0) to 0-100 percentage for meter bar
  const meterPercent = Math.min(100, Math.max(0, ((peakDb + 60) / 60) * 100));

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
            title="Oscilloscope Waveform"
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
            title="Frequency Spectrum"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 60fps Visualizer Canvas */}
      <div className="relative bg-zinc-950 border border-zinc-800/80 rounded overflow-hidden h-24 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          data-testid="visualizer-canvas"
          width={360}
          height={96}
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
          <span className={`${isClipping ? 'text-rose-400 font-bold' : 'text-zinc-300'}`}>
            {peakDb <= -59.5 ? '-∞' : `${peakDb.toFixed(1)} dB`}
          </span>
        </div>

        <div className="h-2 bg-zinc-950 rounded-sm border border-zinc-800 overflow-hidden flex">
          <div
            className={`h-full transition-all duration-75 ${
              isClipping
                ? 'bg-rose-500'
                : peakDb > -12
                ? 'bg-amber-400'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${meterPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[9px] font-mono text-zinc-600 px-0.5">
          <span>-60</span>
          <span>-24</span>
          <span>-12</span>
          <span>-6</span>
          <span className={isClipping ? 'text-rose-500 font-bold' : ''}>0 dB</span>
        </div>
      </div>
    </div>
  );
}
export default Visualizer;
