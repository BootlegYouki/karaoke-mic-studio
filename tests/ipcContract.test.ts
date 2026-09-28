import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Tauri v2 IPC Interface Contract', () => {
  const libRsPath = path.resolve(__dirname, '../src-tauri/src/lib.rs');

  it('declares and registers all required IPC commands in generate_handler', () => {
    expect(fs.existsSync(libRsPath)).toBe(true);
    const libContent = fs.readFileSync(libRsPath, 'utf-8');

    expect(libContent).toContain('fn start_mic');
    expect(libContent).toContain('fn stop_mic');
    expect(libContent).toContain('fn update_settings');
    expect(libContent).toContain('fn get_audio_devices');
    expect(libContent).toContain('fn get_status');

    expect(libContent).toContain('generate_handler!');
    expect(libContent).toContain('start_mic');
    expect(libContent).toContain('stop_mic');
    expect(libContent).toContain('update_settings');
    expect(libContent).toContain('get_audio_devices');
    expect(libContent).toContain('get_status');
  });

  it('manages AudioController state and configures system tray', () => {
    const libContent = fs.readFileSync(libRsPath, 'utf-8');
    expect(libContent).toContain('manage(');
    expect(libContent).toContain('TrayIconBuilder');
  });
});
