# Architecture Specification: Karaoke Mic Studio (Tauri v2 Desktop App)

**Date:** 2026-09-28  
**Status:** Validated Design  
**Target:** Desktop (Linux `.deb` & Windows `.exe` / `.msi`)  
**Repository:** `BootlegYouki/karaoke-mic-studio`  

---

## 1. Executive Summary

**Karaoke Mic Studio** is a native, ultra-low latency desktop karaoke microphone monitor and vocal effects processor built on **Tauri v2**, **Rust** (`cpal`), and a clean, authentic **Google Material Design 3 (Material You)** frontend.

By moving off browser extension limitations and into a native desktop architecture:
1. **Sub-5ms Hardware Latency:** Bypasses web browser buffering and power-throttling completely. Audio capture, DSP, and headphone playback execute in native Rust audio threads via ALSA/PipeWire (Linux) and WASAPI (Windows) using lock-free ring buffers.
2. **Persistent System Tray Execution:** Minimizing or closing the window places the application in the system tray, allowing the user to sing continuously over full-screen YouTube videos without window clutter or background sleep.
3. **Authentic Material Design 3:** Eliminates all "vibecoded" sci-fi/neon aesthetic clutter in favor of calm, tonal surfaces (`surface-container`), generous rounded shapes (`rounded-3xl` and `rounded-full`), and authentic MD3 pill sliders.
4. **Automated Cross-Platform CI/CD:** A GitHub Actions workflow compiles native `.deb` packages for Linux and `.exe`/`.msi` installers for Windows, publishing them to GitHub Releases.

---

## 2. Desktop Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│ Tauri v2 Desktop Process                                        │
│                                                                 │
│  ┌──────────────────────────────┐ ┌───────────────────────────┐ │
│  │ Material Design 3 Frontend   │ │ Native Rust Backend       │ │
│  │ (React 19 + Tailwind v4)     │ │ (cpal + lock-free ringbuf)│ │
│  │                              │ │                           │ │
│  │  [Master Start/Stop Button]  │ │  [Hardware Capture (Mic)] │ │
│  │  [MD3 Pill Volume Slider]    │ │              │            │ │
│  │  [Reverb Chips: Dry/Room/Hall]│◄──IPC──►      ▼            │ │
│  │  [Echo & Vocal Tone Sliders] │ │      [Lock-Free Queue]    │ │
│  │  [Calm MD3 Level Indicator]  │ │              │            │ │
│  │  [System Tray Integration]   │ │              ▼            │ │
│  │                              │ │      [Pure Rust DSP Chain]│ │
│  │                              │ │        - 80Hz Highpass    │ │
│  │                              │ │        - Safety Limiter   │ │
│  │                              │ │        - Schroeder Reverb │ │
│  │                              │ │        - Feedback Delay   │ │
│  │                              │ │        - Presence EQ      │ │
│  │                              │ │              │            │ │
│  └──────────────────────────────┘ └──────────────┼────────────┘ │
│                                                  ▼              │
│                                       [Hardware Output Stream]  │
│                                       (Headphones / DAC: < 5ms) │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Rust Native Audio Engine (`cpal` + `ringbuf`)

### 3.1 Stream Configuration
- **Sample Rate:** Standard 48,000 Hz (or device default).
- **Buffer Size:** Low-latency hardware frames (`cpal::BufferSize::Fixed(128)` or `256` frames = ~2.6ms to 5.3ms latency).
- **Ring Buffer:** Single-producer single-consumer (SPSC) lock-free ring buffer (`ringbuf` crate) isolating the capture thread from the playback thread with zero mutex contention or allocations during audio processing.

### 3.2 Real-Time DSP Pipeline
Executed per-sample in the output callback:
1. **High-Pass Filter:** 2nd-order Butterworth biquad at 80 Hz cutting table thumps, breath pops, and AC rumble.
2. **Input Gain:** Pre-gain volume scaling (0.0x to 2.5x).
3. **Safety Brickwall Limiter:** Fast 2ms attack dynamic compressor clamping vocal spikes above -6 dB to prevent digital clipping or ear fatigue.
4. **Schroeder Reverb:** 4 parallel feedback comb filters + 2 series all-pass filters simulating acoustic room/hall diffusion with adjustable decay and wet mix.
5. **Feedback Delay Line:** Circular buffer delay line with feedback gain and single-pole 2.8 kHz damping filter for vintage karaoke echo.
6. **Presence EQ:** High-shelf filter at 3.5 kHz boosting or attenuating vocal clarity (-6 dB to +6 dB).

### 3.3 Atomic Parameter Synchronization
Audio parameters (`AudioSettings`) are stored in an `Arc<RwLock<AudioSettings>>` or atomic fields, allowing real-time parameter updates from Tauri IPC without interrupting the audio thread.

---

## 4. Material Design 3 Frontend Specification

### 4.1 Color System & Tokens
- **Background / Surface:** Neutral Dark `#111318` (`surface`).
- **Surface Container:** `#1d2024` (`surface-container`), `#282a2f` (`surface-container-high`).
- **Primary Accent:** Soft Periwinkle/Blue `#a8c7fa`, OnPrimary `#042f65`.
- **Secondary / Tertiary:** Soft Teal `#7cd5c8`, Muted Coral `#f2b8b5` (used solely for warnings/clipping).
- **Text:** High contrast `#e2e2e9` (`on-surface`), medium contrast `#c4c6d0` (`on-surface-variant`).
- **Strictly No Vibecoded Elements:** No glowing neon borders, no fake sci-fi HUD grids, no random gradient badges.

### 4.2 Core Components
1. **Top App Bar:** Minimalist title with drag region, Minimize to Tray button, and Close button.
2. **Master Floating Action Pill:** Prominent, full-width MD3 button (`rounded-full`) toggling **START MIC** (Primary container) and **STOP MIC** (Tonal container).
3. **MD3 Pill Sliders:** 
   - 8px thick rounded pill track with 20px round thumb.
   - Distinct active/inactive track color contrast.
   - Value indicator badge on active drag.
4. **Reverb Preset Segmented Chips:** Connected pill container with `Dry`, `Room`, `Hall` chips. Active chip fills with primary tonal color.
5. **Audio Level Indicator:** Subtle horizontal MD3 progress bar indicating RMS vocal level in dB (-60 dB to 0 dB) with smooth peak release.

---

## 5. Tauri v2 IPC Interface

```rust
#[tauri::command]
fn start_mic(device: Option<String>, settings: AudioSettings, state: State<AppState>) -> Result<(), String>;

#[tauri::command]
fn stop_mic(state: State<AppState>) -> Result<(), String>;

#[tauri::command]
fn update_settings(settings: AudioSettings, state: State<AppState>) -> Result<(), String>;

#[tauri::command]
fn get_audio_devices() -> Result<Vec<String>, String>;

#[tauri::command]
fn get_status(state: State<AppState>) -> Result<AudioStatus, String>;
```

---

## 6. CI/CD & Release Pipeline (GitHub Actions)

A GitHub Actions workflow (`.github/workflows/release.yml`) builds cross-platform artifacts on git tag push (`v*`):
- **Linux Job (`ubuntu-22.04`):**
  - Installs `libasound2-dev`, `libpipewire-0.3-dev`, `webkit2gtk-4.1`.
  - Runs `cargo tauri build` to output `.deb` package.
- **Windows Job (`windows-latest`):**
  - Runs `cargo tauri build` to output `.exe` and `.msi` installers.
- **Release Step:** Automatically publishes both artifacts to GitHub Releases with generated changelogs.

---

## 7. Verification Strategy
1. **Rust Unit Tests:**
   - Test DSP filter coefficients (high-pass, high-shelf, comb/all-pass reverb, limiter attenuation).
   - Test ring buffer enqueue/dequeue and underflow/overflow handling.
2. **Tauri IPC Verification:**
   - Test command registration and serialization over `invoke`.
3. **Frontend Component Tests:**
   - Vitest + Testing Library tests for MD3 sliders, preset chips, and device selector.
4. **Local Build Verification:**
   - Compile and verify local desktop binary with `cargo tauri build`.
