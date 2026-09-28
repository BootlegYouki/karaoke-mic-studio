import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { M3Slider } from '../src/components/M3Slider';
import { M3SegmentedButton } from '../src/components/M3SegmentedButton';
import { AudioMeter } from '../src/components/AudioMeter';

describe('Material Design 3 Components', () => {
  describe('M3Slider', () => {
    it('renders with accessible slider role and responds to input changes', () => {
      const onChange = vi.fn();
      render(
        <M3Slider
          label="Vocal Level"
          value={1.0}
          min={0}
          max={2.5}
          step={0.05}
          valueDisplay="100%"
          onChange={onChange}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('aria-valuenow', '1');
      expect(screen.getByText('Vocal Level')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();

      fireEvent.change(slider, { target: { value: '1.5' } });
      expect(onChange).toHaveBeenCalledWith(1.5);
    });
  });

  describe('M3SegmentedButton', () => {
    it('renders segmented capsule with options and triggers selection', () => {
      const onSelect = vi.fn();
      render(
        <M3SegmentedButton
          options={[
            { id: 'dry', label: 'Dry' },
            { id: 'room', label: 'Room' },
            { id: 'hall', label: 'Hall' },
          ]}
          selectedId="room"
          onSelect={onSelect}
        />
      );

      expect(screen.getByRole('button', { name: 'Dry' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Room' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Hall' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Hall' }));
      expect(onSelect).toHaveBeenCalledWith('hall');
    });
  });

  describe('AudioMeter', () => {
    it('renders level indicator with formatted decibels', () => {
      render(<AudioMeter levelDb={-12.5} isActive={true} />);
      expect(screen.getByText('-12.5 dB')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays infinity when level is at noise floor or inactive', () => {
      render(<AudioMeter levelDb={-60} isActive={false} />);
      expect(screen.getByText('-∞ dB')).toBeInTheDocument();
    });
  });
});
