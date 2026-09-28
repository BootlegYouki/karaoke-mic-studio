# Tauri v2 Desktop Karaoke Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native cross-platform desktop application using Tauri v2, Rust (`cpal`) for sub-5ms low-latency audio capture and DSP, and an authentic Google Material Design 3 (Material You) frontend, with automated GitHub Actions compiling Linux `.deb` and Windows `.exe` releases.

**Architecture:** Tauri v2 application where audio capture, processing, and playback execute in high-priority native Rust audio threads via `cpal` using lock-free SPSC ring buffers (`ringbuf`). The frontend communicates over Tauri IPC (`invoke`), featuring calm, authentic Material Design 3 components (M3 pill sliders, segmented chips, surface containers) with system tray minimization.

**Tech Stack:** Tauri v2, Rust (`cpal`, `ringbuf`, `serde`), React 19, TypeScript, Tailwind CSS, Lucide React, GitHub Actions CI/CD.

**Spec:** `docs/superpowers/specs/2026-09-28-tauri-karaoke-studio-design.md`

## Global Constraints
- Native audio latency: Sub-5ms hardware buffer (~128–256 frames at 48kHz).
- Platform targets: Linux (`.deb`) and Windows (`.exe` / `.msi`).
- Visual style: Authentic Google Material Design 3 (Material You). **Zero "vibecoded" elements (no glowing neon borders, no sci-fi HUD grids, no glow box-shadows).**
- System tray: Minimizing or closing the window places the application in the system tray so audio plays continuously in the background.
- Packaging & CI: GitHub Actions matrix compiling `.deb` on Ubuntu and `.exe`/`.msi` on Windows.

## Review Focus
1. **Audio Thread Lock-Free Safety:** The real-time CPAL callback must never allocate memory, lock non-try mutexes, or perform blocking I/O, which could cause audio underruns or buffer crackles.
2. **Buffer Underrun / Overrun Graceful Handling:** If the input ring buffer is empty (e.g. mic momentarily starving), the output callback must fill with silence rather than crashing or popping.
3. **Tray Lifecycle Management:** When the window is hidden to tray, the process must remain running without terminating the CPAL audio thread.
4. **Authentic MD3 Slider Accessibility:** The custom MD3 pill slider must support keyboard arrow navigation and standard ARIA attributes (`role="slider"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`).
5. **Cross-Platform Device Names:** Audio input devices returned by CPAL across Linux (ALSA/Pulse) and Windows (WASAPI) must format cleanly in the device dropdown.

---

### Task 1: Tauri v2 Project Initialization & Toolchain Configuration

**Files:**
- Modify: `package.json`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Test: `tests/tauriConfig.test.ts`

**Interfaces:**
- Produces: Working Tauri v2 project structure where `cargo check` passes and `@tauri-apps/api` is available to the frontend.

- [ ] **Step 1: Write test for Tauri v2 configuration in `tests/tauriConfig.test.ts`**
Verify `tauri.conf.json` defines identifier `com.bootlegyouki.karaokemic`, window size 380x640, bundle target includes `deb`, and capability points to `default.json`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/tauriConfig.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `package.json` with `@tauri-apps/cli` and `@tauri-apps/api` v2**
Add Tauri v2 dependencies and npm scripts (`npm run tauri`).

- [ ] **Step 4: Create `src-tauri/Cargo.toml` and configure dependencies**
Add `tauri` (v2), `cpal`, `ringbuf`, `serde`, `serde_json`, `thiserror`, and `tauri-build`.

- [ ] **Step 5: Create `src-tauri/tauri.conf.json`, `capabilities/default.json`, and `build.rs`**
Configure window parameters, bundle targets, and permissions.

- [ ] **Step 6: Implement minimal `main.rs` and `lib.rs`**
Implement thin passthrough `main.rs` calling `app_lib::run()`.

- [ ] **Step 7: Run verification**
Run: `cd src-tauri && cargo check && cd .. && npx vitest run tests/tauriConfig.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**
```bash
git add package.json src-tauri/ tests/tauriConfig.test.ts
git commit -m "chore: scaffold tauri v2 desktop project with cpal and capabilities"
```

---

### Task 2: Pure Rust Audio DSP Pipeline (High-Pass, Limiter, Reverb, Echo, EQ)

**Files:**
- Create: `src-tauri/src/audio/dsp.rs`
- Test: Rust unit tests in `src-tauri/src/audio/dsp.rs`

**Interfaces:**
- Produces: `struct HighPassFilter`, `struct Limiter`, `struct Reverb`, `struct DelayLine`, `struct HighShelfFilter`.
- Produces: `struct DspChain` processing audio frame-by-frame with zero allocations.

- [ ] **Step 1: Write failing Rust unit tests in `src-tauri/src/audio/dsp.rs`**
Write tests for highpass cutoff at 80Hz, limiter clamping loud signals above -6dB, delay line echoing samples after configured delay, and Schroeder reverb diffusion.

- [ ] **Step 2: Run test to verify it fails**
Run: `cd src-tauri && cargo test dsp`
Expected: FAIL.

- [ ] **Step 3: Implement DSP modules in `src-tauri/src/audio/dsp.rs`**
Implement the mathematical DSP nodes without external C dependencies:
- Highpass Butterworth biquad
- Dynamics compressor/limiter
- Schroeder reverb network (4 comb filters + 2 allpass filters)
- Feedback delay line with 2.8kHz low-pass damping
- High-shelf presence EQ

- [ ] **Step 4: Run test to verify it passes**
Run: `cd src-tauri && cargo test dsp`
Expected: PASS (all DSP tests green).

- [ ] **Step 5: Commit**
```bash
git add src-tauri/src/audio/dsp.rs
git commit -m "feat: implement native rust audio dsp pipeline with limiter and reverb"
```

---

### Task 3: CPAL Hardware Stream Management & Lock-Free Ring Buffer

**Files:**
- Create: `src-tauri/src/audio/stream.rs`
- Create: `src-tauri/src/audio/types.rs`
- Create: `src-tauri/src/audio/mod.rs`
- Test: Rust unit tests in `src-tauri/src/audio/mod.rs`

**Interfaces:**
- Produces: `pub struct AudioController`
  - `pub fn start(&mut self, device_name: Option<String>, settings: AudioSettings) -> Result<(), String>`
  - `pub fn stop(&mut self)`
  - `pub fn update_settings(&mut self, settings: AudioSettings)`
  - `pub fn get_input_devices(&self) -> Vec<String>`
  - `pub fn get_level_db(&self) -> f32`

- [ ] **Step 1: Write unit tests for audio settings and ring buffer logic in `src-tauri/src/audio/mod.rs`**

- [ ] **Step 2: Run test to verify it fails**
Run: `cd src-tauri && cargo test audio`
Expected: FAIL.

- [ ] **Step 3: Implement `AudioController` with CPAL input and output streams**
Pipes microphone samples through `ringbuf::HeapRb<f32>` to the output stream callback, processes through `DspChain`, updates atomic RMS peak level, and handles device fallback.

- [ ] **Step 4: Run test to verify it passes**
Run: `cd src-tauri && cargo test audio`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src-tauri/src/audio/
git commit -m "feat: implement cpal hardware streams and lock-free ring buffer bridge"
```

---

### Task 4: Tauri v2 IPC Commands & System Tray Integration

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/icons/icon.png` (desktop icon)
- Test: `tests/ipcContract.test.ts`

**Interfaces:**
- Exposes commands: `start_mic`, `stop_mic`, `update_settings`, `get_audio_devices`, `get_status`.
- Setup system tray with toggle window visibility and exit actions.

- [ ] **Step 1: Write IPC contract test in `tests/ipcContract.test.ts`**
Verifies Rust command signatures and TypeScript interface definitions match.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/ipcContract.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement IPC commands in `src-tauri/src/lib.rs`**
Manage `Mutex<AudioController>` in Tauri state (`manage`) and expose `#[tauri::command]` functions. Configure system tray.

- [ ] **Step 4: Run verification**
Run: `cd src-tauri && cargo test && cd .. && npx vitest run tests/ipcContract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src-tauri/src/lib.rs tests/ipcContract.test.ts
git commit -m "feat: wire tauri v2 ipc commands and system tray controller"
```

---

### Task 5: Material Design 3 (Material You) UI Components & Layout

**Files:**
- Create: `src/components/M3Slider.tsx`
- Create: `src/components/M3SegmentedButton.tsx`
- Create: `src/components/AudioMeter.tsx`
- Create: `src/hooks/useTauriAudio.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles/globals.css`
- Test: `tests/m3Components.test.tsx`

**Interfaces:**
- Produces: Authentic Material Design 3 interface with calm tonal palettes, M3 pill sliders, and smooth level meter.

- [ ] **Step 1: Write tests for M3 components in `tests/m3Components.test.tsx`**
Verify M3Slider handles touch/mouse drags, ARIA values, and Reverb segmented button toggles.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/m3Components.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement M3 design tokens and components**
Build `M3Slider` with thick pill track and 20px thumb, `M3SegmentedButton` with connected pill capsules, and `AudioMeter` with subtle MD3 level indicator.

- [ ] **Step 4: Implement `useTauriAudio.ts` and integrate in `src/App.tsx`**
Connects to Tauri IPC commands with fallback mock mode for browser testing.

- [ ] **Step 5: Run tests to verify they pass**
Run: `npx vitest run tests/m3Components.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/ tests/m3Components.test.tsx
git commit -m "feat: build authentic material design 3 ui and tauri ipc bridge"
```

---

### Task 6: GitHub Actions Workflow for Cross-Platform Releases

**Files:**
- Create: `.github/workflows/release.yml`
- Test: Valid YAML syntax check

**Interfaces:**
- Produces: Matrix build for `ubuntu-22.04` (producing `.deb`) and `windows-latest` (producing `.exe` and `.msi`), published to GitHub Releases.

- [ ] **Step 1: Create `.github/workflows/release.yml`**
Configure triggers on tag push (`v*`), install system dependencies on Ubuntu (`libasound2-dev`, `libpipewire-0.3-dev`), and run `tauri-apps/tauri-action`.

- [ ] **Step 2: Verify workflow syntax**
Run: `node -e "console.log(require('fs').readFileSync('.github/workflows/release.yml', 'utf-8').length > 0)"`
Expected: true.

- [ ] **Step 3: Commit**
```bash
git add .github/workflows/release.yml
git commit -m "ci: add cross-platform github actions workflow for deb and windows installers"
```

---

### Task 7: Local Build Verification & GitHub Public Repository Setup

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces: Successfully compiled local binary via `cargo tauri build`, and public GitHub repository `BootlegYouki/karaoke-mic-studio`.

- [ ] **Step 1: Run full automated test suite (Rust + Frontend)**
Run: `cd src-tauri && cargo test && cd .. && npm run test`
Expected: All tests pass.

- [ ] **Step 2: Run local Tauri build verification**
Run: `npx tauri build --no-bundle`
Expected: Native binary compiled successfully.

- [ ] **Step 3: Update `README.md` with desktop usage, shortcuts, and release download links**

- [ ] **Step 4: Push to GitHub public repository `BootlegYouki/karaoke-mic-studio`**
Create public repo via `gh repo create` and push `master` branch.

- [ ] **Step 5: Commit and tag release**
```bash
git add .
git commit -m "feat: complete native desktop karaoke studio with material design 3"
git tag v1.0.0
```
