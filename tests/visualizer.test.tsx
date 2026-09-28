import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Visualizer } from '../src/components/Visualizer';

describe('Pro-Audio Visualizer Component', () => {
  let mockRafId = 123;
  let rafCallback: FrameRequestCallback | null = null;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      rafCallback = cb;
      return mockRafId;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    // Mock HTMLCanvasElement.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
    });
  });

  it('renders idle standby state when monitor is inactive', () => {
    render(<Visualizer analyser={null} isActive={false} />);
    expect(screen.getByText('STANDBY')).toBeInTheDocument();
    expect(screen.getByTestId('visualizer-canvas')).toBeInTheDocument();
  });

  it('starts animation loop when active and cancels on unmount', () => {
    const mockAnalyser = {
      fftSize: 256,
      frequencyBinCount: 128,
      getByteTimeDomainData: vi.fn((arr: Uint8Array) => arr.fill(128)),
      getByteFrequencyData: vi.fn((arr: Uint8Array) => arr.fill(0)),
    } as unknown as AnalyserNode;

    const { unmount } = render(<Visualizer analyser={mockAnalyser} isActive={true} />);

    expect(requestAnimationFrame).toHaveBeenCalled();
    expect(screen.getByText(/LIVE/i)).toBeInTheDocument();

    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(mockRafId);
  });
});
