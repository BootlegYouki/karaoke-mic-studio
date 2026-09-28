import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Tauri v2 Desktop Configuration', () => {
  const tauriConfPath = path.resolve(__dirname, '../src-tauri/tauri.conf.json');
  const capabilityPath = path.resolve(__dirname, '../src-tauri/capabilities/default.json');
  const cargoPath = path.resolve(__dirname, '../src-tauri/Cargo.toml');

  it('contains valid tauri.conf.json with desktop window and deb bundle', () => {
    expect(fs.existsSync(tauriConfPath)).toBe(true);
    const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
    expect(conf.productName).toBe('Karaoke Mic Studio');
    expect(conf.identifier).toBe('com.bootlegyouki.karaokemic');
    expect(conf.app.windows[0].width).toBe(380);
    expect(conf.app.windows[0].height).toBe(640);
    expect(conf.bundle.targets).toContain('deb');
  });

  it('contains default capability granting core permissions', () => {
    expect(fs.existsSync(capabilityPath)).toBe(true);
    const cap = JSON.parse(fs.readFileSync(capabilityPath, 'utf-8'));
    expect(cap.identifier).toBe('default');
    expect(cap.permissions).toContain('core:default');
  });

  it('defines Rust dependencies in Cargo.toml', () => {
    expect(fs.existsSync(cargoPath)).toBe(true);
    const cargo = fs.readFileSync(cargoPath, 'utf-8');
    expect(cargo).toContain('tauri =');
    expect(cargo).toContain('cpal =');
    expect(cargo).toContain('ringbuf =');
  });
});
