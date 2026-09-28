import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStoredSettings, saveStoredSettings, DEFAULT_KARAOKE_SETTINGS } from '../src/storage/storageAdapter';

describe('Storage Adapter', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (globalThis as any).chrome;
  });

  it('returns DEFAULT_KARAOKE_SETTINGS when storage is unpopulated', async () => {
    const settings = await getStoredSettings();
    expect(settings).toEqual(DEFAULT_KARAOKE_SETTINGS);
  });

  it('saves and retrieves settings using localStorage fallback in non-extension environment', async () => {
    await saveStoredSettings({ micGain: 1.75, reverbPreset: 'hall' });
    const settings = await getStoredSettings();

    expect(settings.micGain).toBe(1.75);
    expect(settings.reverbPreset).toBe('hall');
    // Default values preserved
    expect(settings.isMuted).toBe(false);
  });

  it('uses chrome.storage.local when available', async () => {
    const mockStorage: Record<string, any> = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn((_keys, cb) => cb({ karaoke_settings: mockStorage.karaoke_settings })),
          set: vi.fn((data, cb) => {
            Object.assign(mockStorage, data);
            if (cb) cb();
          }),
        },
      },
    };

    await saveStoredSettings({ delayFeedback: 0.45 });
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        karaoke_settings: expect.objectContaining({ delayFeedback: 0.45 }),
      }),
      expect.any(Function)
    );

    const loaded = await getStoredSettings();
    expect(loaded.delayFeedback).toBe(0.45);
  });
});
