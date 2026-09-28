import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Chrome Extension Manifest V3', () => {
  const manifestPath = path.resolve(__dirname, '../public/manifest.json');

  it('exists and is valid JSON', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.manifest_version).toBe(3);
    expect(parsed.name).toBe('Karaoke Mic Studio');
  });

  it('declares strictly minimal permissions without overprivileged hosts', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.permissions).toEqual(['sidePanel', 'storage']);
    expect(parsed.key).toBeDefined();
    expect(parsed.host_permissions).toBeUndefined();
  });

  it('points side_panel default_path to index.html', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.side_panel?.default_path).toBe('index.html');
  });

  it('declares background service worker as module background.js', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.background?.service_worker).toBe('background.js');
    expect(parsed.background?.type).toBe('module');
  });
});
