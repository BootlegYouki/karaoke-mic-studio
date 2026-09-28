import { useState, useEffect, useCallback, useRef } from 'react';

export interface AudioSettings {
  device_name: string | null;
  mic_gain: number;
  is_muted: boolean;
  reverb_preset: string;
  reverb_mix: number;
  echo_percent: number;
  tone_db: number;
}

export interface AudioStatus {
  is_active: boolean;
  sample_rate: number;
  current_level_db: number;
}

const DEFAULT_SETTINGS: AudioSettings = {
  device_name: null,
  mic_gain: 1.0,
  is_muted: false,
  reverb_preset: 'room',
  reverb_mix: 0.35,
  echo_percent: 20.0,
  tone_db: 0.0,
};

// Check if running inside a Tauri v2 environment
const isTauriEnv = () =>
  typeof window !== 'undefined' &&
  (Boolean((window as any).__TAURI_INTERNALS__) || Boolean((window as any).__TAURI__));

export function useTauriAudio() {
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<AudioStatus>({
    is_active: false,
    sample_rate: 48000,
    current_level_db: -60.0,
  });
  const [devices, setDevices] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isTauri = useRef(isTauriEnv());

  // Enumerate input devices on mount
  useEffect(() => {
    if (isTauri.current) {
      import('@tauri-apps/api/core')
        .then(({ invoke }) => {
          invoke<string[]>('get_audio_devices')
            .then(setDevices)
            .catch((err) => console.warn('Failed to get audio devices:', err));

          invoke<AudioStatus>('get_status')
            .then(setStatus)
            .catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  // Poll status & VU level when active
  useEffect(() => {
    if (!status.is_active || !isTauri.current) return;

    let timerId: any = null;
    import('@tauri-apps/api/core').then(({ invoke }) => {
      timerId = setInterval(() => {
        invoke<AudioStatus>('get_status')
          .then(setStatus)
          .catch(() => {});
      }, 40); // 25 FPS polling for calm MD3 level meter
    });

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [status.is_active]);

  const startMic = useCallback(
    async (device?: string) => {
      setError(null);
      if (isTauri.current) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const newStatus = await invoke<AudioStatus>('start_mic', {
            device: device || settings.device_name,
            settings,
          });
          setStatus(newStatus);
        } catch (err: any) {
          setError(err.toString());
        }
      } else {
        // Mock fallback for browser preview
        setStatus((s) => ({ ...s, is_active: true }));
      }
    },
    [settings]
  );

  const stopMic = useCallback(async () => {
    setError(null);
    if (isTauri.current) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const newStatus = await invoke<AudioStatus>('stop_mic');
        setStatus(newStatus);
      } catch (err: any) {
        setError(err.toString());
      }
    } else {
      setStatus((s) => ({ ...s, is_active: false, current_level_db: -60.0 }));
    }
  }, []);

  const updateSettings = useCallback(
    (updates: Partial<AudioSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...updates };
        if (isTauri.current) {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('update_settings', { settings: next }).catch((err) =>
              console.warn('Failed to update settings:', err)
            );
          });
        }
        return next;
      });
    },
    []
  );

  return {
    settings,
    status,
    devices,
    error,
    startMic,
    stopMic,
    updateSettings,
  };
}
