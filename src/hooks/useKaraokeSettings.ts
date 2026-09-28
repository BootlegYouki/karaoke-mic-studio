import { useState, useEffect, useCallback } from 'react';
import { KaraokeSettings } from '../audio/types';
import { DEFAULT_KARAOKE_SETTINGS, getStoredSettings, saveStoredSettings } from '../storage/storageAdapter';

export function useKaraokeSettings() {
  const [settings, setSettings] = useState<KaraokeSettings>(DEFAULT_KARAOKE_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getStoredSettings().then((loaded) => {
      if (isMounted) {
        setSettings(loaded);
        setIsLoaded(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const updateSettings = useCallback((updates: Partial<KaraokeSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      saveStoredSettings(next).catch((err) => {
        console.error('Failed to save settings:', err);
      });
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_KARAOKE_SETTINGS);
    saveStoredSettings(DEFAULT_KARAOKE_SETTINGS).catch((err) => {
      console.error('Failed to reset settings:', err);
    });
  }, []);

  return {
    settings,
    isLoaded,
    updateSettings,
    resetSettings,
  };
}
