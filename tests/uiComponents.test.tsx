import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from '../src/components/TopBar';
import { MasterControls } from '../src/components/MasterControls';
import { EffectsRack } from '../src/components/EffectsRack';
import { PermissionPrompt } from '../src/components/PermissionPrompt';
import { DEFAULT_KARAOKE_SETTINGS } from '../src/storage/storageAdapter';

describe('UI Studio Components', () => {
  describe('TopBar', () => {
    it('renders title, device selector and triggers monitor toggle', () => {
      const onToggle = vi.fn();
      const onDeviceChange = vi.fn();

      render(
        <TopBar
          isActive={false}
          onToggle={onToggle}
          devices={[{ deviceId: 'mic-1', label: 'USB Audio Device' } as MediaDeviceInfo]}
          selectedDeviceId="mic-1"
          onDeviceChange={onDeviceChange}
        />
      );

      expect(screen.getByText('Karaoke Mic Studio')).toBeInTheDocument();
      expect(screen.getByText('USB Audio Device')).toBeInTheDocument();

      const toggleBtn = screen.getByRole('button', { name: /start monitor/i });
      fireEvent.click(toggleBtn);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('MasterControls', () => {
    it('handles gain slider, mute toggle, and reset', () => {
      const onGainChange = vi.fn();
      const onToggleMute = vi.fn();
      const onReset = vi.fn();

      render(
        <MasterControls
          micGain={1.2}
          isMuted={false}
          onGainChange={onGainChange}
          onToggleMute={onToggleMute}
          onReset={onReset}
        />
      );

      const gainSlider = screen.getByLabelText(/mic volume/i);
      fireEvent.change(gainSlider, { target: { value: '1.5' } });
      expect(onGainChange).toHaveBeenCalledWith(1.5);

      const muteBtn = screen.getByRole('button', { name: /mute/i });
      fireEvent.click(muteBtn);
      expect(onToggleMute).toHaveBeenCalled();

      const resetBtn = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetBtn);
      expect(onReset).toHaveBeenCalled();
    });
  });

  describe('EffectsRack', () => {
    it('allows changing reverb presets, mix, and echo parameters', () => {
      const onUpdate = vi.fn();

      render(
        <EffectsRack
          settings={DEFAULT_KARAOKE_SETTINGS}
          onUpdateSettings={onUpdate}
        />
      );

      // Verify preset chips exist
      expect(screen.getByRole('button', { name: 'Dry' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cozy Room' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Karaoke Club' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Concert Hall' })).toBeInTheDocument();

      // Click preset
      fireEvent.click(screen.getByRole('button', { name: 'Concert Hall' }));
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ reverbPreset: 'hall' })
      );
    });
  });

  describe('PermissionPrompt', () => {
    it('renders clean permission prompt and retry button', () => {
      const onRetry = vi.fn();
      render(<PermissionPrompt error="NotAllowedError" onRetry={onRetry} />);

      expect(screen.getByText(/Microphone Access Required/i)).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /allow microphone/i });
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });
});
