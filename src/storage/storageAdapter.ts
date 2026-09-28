import { KaraokeSettings } from '../audio/types';

export const DEFAULT_KARAOKE_SETTINGS: KaraokeSettings = {
  preferredDeviceId: '',
  micGain: 1.0,
  isMuted: false,
  reverbPreset: 'club',
  reverbMix: 0.35,
  reverbDecay: 1.8,
  delayTime: 0.18,
  delayFeedback: 0.25,
  delayMix: 0.20,
  toneClarity: 2.0,
};

const STORAGE_KEY = 'karaoke_settings';

export async function getStoredSettings(): Promise<KaraokeSettings> {
  // If running inside Chrome Extension with storage permissions
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (result && result[STORAGE_KEY]) {
          resolve({ ...DEFAULT_KARAOKE_SETTINGS, ...result[STORAGE_KEY] });
        } else {
          resolve(DEFAULT_KARAOKE_SETTINGS);
        }
      });
    });
  }

  // Fallback to localStorage for development / testing environments
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_KARAOKE_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to parse localStorage settings:', e);
    }
  }

  return DEFAULT_KARAOKE_SETTINGS;
}

export async function saveStoredSettings(updates: Partial<KaraokeSettings>): Promise<void> {
  const current = await getStoredSettings();
  const merged: KaraokeSettings = { ...current, ...updates };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: merged }, () => {
        resolve();
      });
    });
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }
}
