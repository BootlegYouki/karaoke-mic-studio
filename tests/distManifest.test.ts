import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Built Extension Distribution (dist/)', () => {
  const distDir = path.resolve(__dirname, '../dist');

  it('contains valid compiled manifest.json', () => {
    const manifestPath = path.join(distDir, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background.service_worker).toBe('background.js');
    expect(manifest.side_panel.default_path).toBe('index.html');
  });

  it('contains background service worker file', () => {
    const bgPath = path.join(distDir, 'background.js');
    expect(fs.existsSync(bgPath)).toBe(true);
    const content = fs.readFileSync(bgPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('contains index.html for the side panel', () => {
    const indexPath = path.join(distDir, 'index.html');
    expect(fs.existsSync(indexPath)).toBe(true);
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('id="root"');
  });

  it('contains all required extension icons', () => {
    expect(fs.existsSync(path.join(distDir, 'icons/icon-16.png'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'icons/icon-48.png'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'icons/icon-128.png'))).toBe(true);
  });
});
