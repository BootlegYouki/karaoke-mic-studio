# Karaoke Mic Studio (Chrome Extension) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Chrome Extension (Manifest V3) that provides a low-latency live microphone monitor and vocal effects studio (Limiter, Reverb, Echo, EQ, 60fps VU Visualizer) in the Chrome Side Panel for singing karaoke over web music playback.

**Architecture:** A Vite + React 19 + TypeScript frontend with Tailwind CSS and Lucide icons hosted in the Chrome Side Panel (`chrome.sidePanel`). Audio is handled via a low-latency Web Audio API graph (`AudioContext({ latencyHint: 'interactive' })`) capturing raw mic input (AEC/AGC disabled) and feeding an 80Hz rumble filter, fast safety limiter, algorithmic impulse reverb, and feedback delay line. State persists via `chrome.storage.local`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Vitest, Web Audio API, Chrome Extensions Manifest V3.

**Spec:** `docs/superpowers/specs/2026-09-28-karaoke-mic-extension-design.md`

## Global Constraints
- Manifest Version: 3 with `"sidePanel"` and `"audioCapture"` permissions.
- Design: Dark zinc/slate tactile pro-audio aesthetic (`bg-zinc-950`, `border-zinc-800`, monospace telemetry).
- Iconography: Exclusively Lucide icons (`lucide-react`). **Zero emojis in the UI.**
- Audio latency: Request `latencyHint: 'interactive'` with `echoCancellation: false`, `noiseSuppression: false`, and `autoGainControl: false` for singing dynamic range.
- Audio safety: 2ms fast-attack `DynamicsCompressorNode` acting as a brickwall limiter to prevent hearing damage/distortion.

## Review Focus
1. **AudioContext Autoplay Policy:** Chrome blocks `AudioContext` from producing sound until a user gesture occurs. The master monitor switch must explicitly trigger `audioContext.resume()` within its click handler.
2. **Permission Rejection / Hardware Absence:** If the user denies mic permission or has no mic plugged in, the UI must show an uncluttered diagnostic banner with a retry button instead of failing silently or crashing.
3. **Storage Fallback in Dev / Test Environments:** When running outside an unpacked Chrome extension (e.g. `npm run dev` or Vitest), `chrome.storage.local` is undefined; the storage adapter must fall back seamlessly to `localStorage`.
4. **Impulse Response Buffer Validity:** The mathematical reverb impulse buffer generator must never produce `NaN`, `Infinity`, or out-of-range floats (-1.0 to 1.0) that could corrupt the Web Audio engine.
5. **Canvas Animation Frame Cleanup:** The 60 FPS visualizer must cancel `requestAnimationFrame` when the monitor is stopped or the component unmounts to prevent memory leaks and background CPU consumption.

---

### Task 1: Project Scaffolding & Toolchain Setup

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/styles/globals.css`
- Create: `vitest.config.ts`
- Test: `tests/setup.ts`

**Interfaces:**
- Produces: Project build pipeline (`npm run build`, `npm run test`, `npm run dev`).

- [ ] **Step 1: Create `package.json` with dependencies**
Includes React 19, Lucide React, Tailwind CSS, Vite, TypeScript, and Vitest.

- [ ] **Step 2: Configure `vite.config.ts`, `tsconfig.json`, and Tailwind CSS**
Vite configured with `@vitejs/plugin-react` and static build output targeting `dist/`.

- [ ] **Step 3: Create base HTML entry point `index.html` and root React mount `src/main.tsx`**

- [ ] **Step 4: Install dependencies and verify environment**
Run: `npm install`
Expected: `node_modules` generated without peer dependency errors.

- [ ] **Step 5: Verify build works**
Run: `npm run build`
Expected: `dist/index.html` and bundled assets generated.

- [ ] **Step 6: Commit**
```bash
git add package.json vite.config.ts tsconfig.json index.html src/ vitest.config.ts
git commit -m "chore: scaffold vite react typescript extension project"
```

---

### Task 2: Manifest V3 Configuration & Extension Background Service Worker

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon-16.png`, `public/icons/icon-48.png`, `public/icons/icon-128.png`
- Create: `src/background.ts`
- Test: `tests/manifest.test.ts`

**Interfaces:**
- Produces: `dist/manifest.json` and `dist/background.js` enabling `chrome.sidePanel` on extension action click.

- [ ] **Step 1: Write test for manifest validity in `tests/manifest.test.ts`**
Verifies `manifest_version === 3`, `permissions` contains `["sidePanel", "storage", "audioCapture"]`, and `side_panel.default_path` points to `index.html`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/manifest.test.ts`
Expected: FAIL (file not found).

- [ ] **Step 3: Implement `public/manifest.json` and generate extension icon assets**
Create valid MV3 manifest and SVG/PNG icon assets.

- [ ] **Step 4: Implement `src/background.ts`**
Register `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`.

- [ ] **Step 5: Run manifest test**
Run: `npx vitest run tests/manifest.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add public/ src/background.ts tests/manifest.test.ts
git commit -m "feat: configure chrome manifest v3 and side panel background service"
```

---

### Task 3: Algorithmic Reverb Impulse & Delay DSP Nodes

**Files:**
- Create: `src/audio/ReverbGenerator.ts`
- Create: `src/audio/types.ts`
- Test: `tests/reverb.test.ts`

**Interfaces:**
- Produces: `generateReverbImpulse(audioContext: BaseAudioContext, decaySeconds: number, dampingFreq: number, reverse?: boolean): AudioBuffer`
- Produces: `REVERB_PRESETS` configuration dictionary.

- [ ] **Step 1: Write failing tests in `tests/reverb.test.ts`**
Verify `generateReverbImpulse` returns an `AudioBuffer` with 2 channels, sample rate matching context, length = `sampleRate * decaySeconds`, and all samples are finite numbers between -1.0 and 1.0 (no `NaN` or `Infinity`).

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/reverb.test.ts`
Expected: FAIL (`generateReverbImpulse` not found).

- [ ] **Step 3: Implement `src/audio/types.ts` and `src/audio/ReverbGenerator.ts`**
Implement the mathematical decay envelope with white noise generation and high-frequency damping.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/reverb.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/audio/ tests/reverb.test.ts
git commit -m "feat: implement algorithmic reverb impulse generator and presets"
```

---

### Task 4: Core Web Audio Engine Pipeline

**Files:**
- Create: `src/audio/AudioEngine.ts`
- Test: `tests/audioEngine.test.ts`

**Interfaces:**
- Produces: `class AudioEngine`
  - `start(deviceId?: string): Promise<void>`
  - `stop(): void`
  - `setMicGain(gain: number): void`
  - `setMute(isMuted: boolean): void`
  - `setReverb(preset: ReverbPresetName, mix: number, decay?: number): void`
  - `setDelay(timeSeconds: number, feedback: number, mix: number): void`
  - `setTone(clarityDb: number): void`
  - `getAnalyser(): AnalyserNode | null`
  - `getTelemetry(): { sampleRate: number, state: AudioContextState, baseLatency: number }`

- [ ] **Step 1: Write failing tests in `tests/audioEngine.test.ts`**
Verify the initialization of Web Audio nodes (Biquad high-pass at 80Hz, DynamicsCompressor with -6dB threshold and 2ms attack, Convolver, DelayNode, GainNodes, and AnalyserNode) with mock Web Audio context.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/audioEngine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/audio/AudioEngine.ts`**
Build the complete low-latency interactive audio graph connecting mic -> filter -> compressor -> effect parallel buses -> master gain -> analyser -> destination.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/audioEngine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/audio/AudioEngine.ts tests/audioEngine.test.ts
git commit -m "feat: implement core web audio dsp engine with safety limiter"
```

---

### Task 5: Persistent Storage Adapter & React State Hook

**Files:**
- Create: `src/storage/storageAdapter.ts`
- Create: `src/hooks/useKaraokeSettings.ts`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Produces: `getStoredSettings(): Promise<KaraokeSettings>`
- Produces: `saveStoredSettings(settings: Partial<KaraokeSettings>): Promise<void>`
- Produces: `useKaraokeSettings()` React hook.

- [ ] **Step 1: Write failing tests in `tests/storage.test.ts`**
Verify reading default settings when storage is empty, saving updates to `chrome.storage.local`, and falling back to `localStorage` when `chrome.storage` is undefined.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/storage.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/storage/storageAdapter.ts` and `src/hooks/useKaraokeSettings.ts`**
Implement storage abstraction with default settings and reactive state syncing.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/storage/ src/hooks/ tests/storage.test.ts
git commit -m "feat: implement chrome storage adapter and settings hook"
```

---

### Task 6: Pro-Audio Visualizer & Peak VU Meter Component

**Files:**
- Create: `src/components/Visualizer.tsx`
- Test: `tests/visualizer.test.tsx`

**Interfaces:**
- Consumes: `analyser: AnalyserNode | null`, `isActive: boolean`
- Produces: Real-time 60fps Canvas rendering oscillating waveform / frequency spectrum and dual segmented Peak VU meter with clipping indicator.

- [ ] **Step 1: Write test for Visualizer rendering and lifecycle cleanup in `tests/visualizer.test.tsx`**
Verify canvas renders, animation frame loops when `isActive=true`, and cleanly calls `cancelAnimationFrame` on unmount.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/visualizer.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `src/components/Visualizer.tsx`**
Dark tactile oscilloscope wave rendering, RMS volume calculation, and multi-segment peak meter (-60dB to 0dB with green/yellow/red color bands).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/visualizer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/Visualizer.tsx tests/visualizer.test.tsx
git commit -m "feat: implement 60fps canvas visualizer and peak vu meter"
```

---

### Task 7: Hardware Controls, Effects Rack & Studio UI

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/MasterControls.tsx`
- Create: `src/components/EffectsRack.tsx`
- Create: `src/components/PermissionPrompt.tsx`
- Modify: `src/App.tsx`
- Test: `tests/uiComponents.test.tsx`

**Interfaces:**
- Uses: Lucide icons (`Mic`, `MicOff`, `Volume2`, `Activity`, `Sliders`, `Sparkles`, `RotateCcw`, `Headphones`, `Radio`).
- Produces: Complete Side Panel Studio UI adhering to the tactile dark zinc pro-audio design.

- [ ] **Step 1: Write tests in `tests/uiComponents.test.tsx`**
Verify volume slider triggers gain update, mute button toggles state and updates icon, reverb preset chips trigger preset switch, and permission prompt shows retry action.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/uiComponents.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement components in `src/components/` and assemble in `src/App.tsx`**
Include keyboard shortcut (Spacebar quick-mute), device selection with hotplugging event (`devicechange`), and zero-emoji pro-audio styling.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/uiComponents.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/ src/App.tsx tests/uiComponents.test.tsx
git commit -m "feat: build pro-audio tactile studio ui and effects controls"
```

---

### Task 8: End-to-End Build, Extension Packaging & Verification

**Files:**
- Create: `scripts/build-extension.js` or update `vite.config.ts`
- Documentation: `README.md`

**Interfaces:**
- Produces: Valid Chrome Extension directory in `dist/` ready to load via `chrome://extensions` "Load unpacked".

- [ ] **Step 1: Configure build script to ensure `dist/` contains all MV3 assets**
Ensure `manifest.json`, `background.js`, `index.html`, icons, and bundled chunks are properly emitted to `dist/`.

- [ ] **Step 2: Run complete test suite and build**
Run: `npm run test && npm run build`
Expected: All unit tests pass, and `dist/manifest.json` exists and is valid JSON.

- [ ] **Step 3: Add `README.md` with step-by-step instructions for loading into Chrome**
Document how to load unpacked extension, open side panel next to YouTube, select mic, and wear headphones.

- [ ] **Step 4: Commit**
```bash
git add .
git commit -m "feat: complete extension packaging and verification documentation"
```
