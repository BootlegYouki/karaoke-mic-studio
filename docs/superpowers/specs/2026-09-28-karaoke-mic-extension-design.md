# Architecture Specification: Karaoke Mic Studio (Chrome Extension)

**Date:** 2026-09-28  
**Status:** Validated Design  
**Target:** Chrome Extension (Manifest V3)  

---

## 1. Executive Summary

**Karaoke Mic Studio** is a low-latency live microphone monitoring and vocal effects Chrome Extension designed for karaoke singing over web audio/video playback (YouTube, Spotify Web, Karaoke-Version, etc.).

Unlike conventional voice recording or communication extensions, Karaoke Mic Studio captures unprocessed, full-dynamic-range vocal audio, runs it through an interactive, low-latency DSP chain (80Hz rumble high-pass filter, fast safety limiter, algorithmic room/hall reverb, and feedback karaoke echo), and routes the vocal mix directly to the singer's headphones with a real-time 60 FPS visualizer.

The extension is docked directly beside active tabs using the Chrome Manifest V3 **Side Panel API** (`chrome.sidePanel`), ensuring the vocal monitor remains open and fully responsive even while clicking, scrubbing, or interacting with video players.

---

## 2. System Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│ Chrome Browser                                                  │
│                                                                 │
│  ┌──────────────────────────────┐ ┌───────────────────────────┐ │
│  │ Active Tab (e.g. YouTube)    │ │ Side Panel (Karaoke Mic)  │ │
│  │                              │ │                           │ │
│  │ [Karaoke Video / Music Track]│ │ [React + Vite UI]         │ │
│  │             │                │ │         │                 │ │
│  └─────────────┼────────────────┘ │         ▼                 │ │
│                │                  │ [Web Audio DSP Pipeline]  │ │
│                │                  │   - Limiter & High-Pass   │ │
│                │                  │   - Algorithmic Reverb    │ │
│                │                  │   - Feedback Delay        │ │
│                │                  │   - 60fps Canvas Analyzer │ │
│                │                  └─────────┬─────────────────┘ │
│                │                            │                   │
│                └──────────────┬─────────────┘                   │
│                               ▼                                 │
│                   [Headphones / Soundcard]                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Core Technology Stack
- **Framework & Bundler:** React 19, TypeScript, Vite.
- **Styling & Icons:** Tailwind CSS, `lucide-react` (strictly no emojis; tactile studio hardware theme).
- **Audio Platform:** Native Web Audio API (`AudioContext({ latencyHint: 'interactive' })`).
- **Extension Platform:** Chrome Manifest V3 (`sidePanel`, `storage`, `audioCapture`).

---

## 3. Web Audio DSP Pipeline

```text
[Mic Stream: getUserMedia]
        │
        ▼
[BiquadFilter: High-Pass 80Hz]  ── Eliminates table bumps, breath pops, sub-bass rumble
        │
        ▼
[GainNode: Mic Volume Slider]  ── Digital gain (0.0x to 2.5x)
        │
        ▼
[DynamicsCompressor: Safety Limiter]
  - threshold: -6 dB
  - knee: 10 dB
  - ratio: 20:1
  - attack: 2ms (prevents digital clipping/ear fatigue during loud vocal belting)
  - release: 100ms
        │
        ├───► [Dry Vocal Path] ──────────────────────────┐
        │                                                │
        ├───► [Reverb Processor] (Impulse Convolution) ──┼──► [Master Gain & Mute] ──► [AnalyserNode] ──► [Destination]
        │                                                │                               │
        └───► [Echo / Delay Loop] (Karaoke Delay) ───────┘                               ▼
                                                                                [60 FPS Visualizer]
```

### 3.1 Audio Capture Configuration
Standard speech processing algorithms mangle singing vocals by treating sustained notes as background noise or room reverberation. The capture stream explicitly disables voice-call filters:

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
    echoCancellation: false,  // Preserves singing harmonics and prevents phase issues
    noiseSuppression: false,  // Prevents muting of sustaining notes
    autoGainControl: false,   // Preserves natural vocal dynamics (whisper vs belt)
    latency: 0,
    channelCount: 1,
    sampleRate: 48000
  }
});
```

### 3.2 Algorithmic Reverb Generator
Instead of bundling large, static WAV impulse files that degrade startup performance and break offline reliability, impulse response buffers are generated in memory mathematically using an exponentially decaying white-noise envelope with frequency-dependent damping:

- **Decay Time:** 0.2s to 4.0s.
- **Presets:**
  - `Dry / Off`: Wet mix 0%.
  - `Cozy Room`: Decay 0.8s, damping 2500Hz, mix 20%.
  - `Karaoke Club`: Decay 1.8s, damping 3800Hz, mix 35%.
  - `Concert Hall`: Decay 3.2s, damping 5000Hz, mix 45%.

### 3.3 Delay / Echo Engine
- **Delay Time:** 50ms – 500ms (default 180ms).
- **Feedback Gain:** 0% – 70% (damped to prevent runaway oscillation).
- **Damping Filter:** 6dB/oct low-pass at 2800Hz for a warm, vintage tape-echo character.

### 3.4 Tone Shaping (Vocal Presence EQ)
- **High Shelf Filter:** 3.5kHz (+/- 6dB) for airy vocal clarity and presence without harshness.

---

## 4. UI/UX Specification

### 4.1 Visual Design Language
- **Industrial Pro-Audio Aesthetic:** Inspired by modern studio hardware (Teenage Engineering, Universal Audio, Ableton).
- **Color Palette:** Deep zinc/slate background (`bg-zinc-950`, `bg-zinc-900`), crisp micro-borders (`border-zinc-800`), neutral silver text (`text-zinc-200`, `text-zinc-400`), and focused functional accents (`cyan-500` for active monitor, `amber-500` for warning, `emerald-500` for signal levels, `red-500` for peak clip).
- **Typography:** Sans-serif for navigation, monospace (`font-mono`) for precision telemetry (`-4.2 dB`, `180 ms`, `48.0 kHz`).
- **Icons:** Exclusively `lucide-react` icons (e.g. `Mic`, `MicOff`, `Sliders`, `Volume2`, `Activity`, `Sparkles`, `RefreshCw`, `Headphones`). **No emojis anywhere in the interface.**

### 4.2 Component Breakdown

1. **Top Bar Header:**
   - App title ("Karaoke Mic Studio") with `Mic` icon.
   - Master Monitor Power Switch (tactile toggle button with glowing active status ring).
   - Headphone Status Indicator (`Headphones` icon reminding the user that headphones are recommended).

2. **Hardware Device Selector:**
   - Dropdown selector listing available microphone inputs (`MediaDeviceInfo`).
   - Auto-refreshes on hardware connect/disconnect.

3. **Live Telemetry & Visualizer:**
   - 60 FPS Canvas visualizer switching between Smooth Oscilloscope Waveform and Multi-band Frequency Bars.
   - Dual Peak VU Meter:
     - Normal vocal range (-60 dB to -12 dB): Emerald green.
     - Strong vocal range (-12 dB to -2 dB): Amber yellow.
     - Overload/Clip (> -2 dB): Crimson red indicator with soft peak hold.

4. **Master Vocal Controls:**
   - Primary Mic Gain slider (0% to 250%) with calibrated decibel readout.
   - Instant Quick-Mute button (`MicOff` icon, supports Spacebar keyboard shortcut).
   - "Reset to Defaults" button (`RotateCcw` icon).

5. **Studio FX Rack:**
   - **Reverb Card:** Preset selector chips (`Dry`, `Room`, `Club`, `Hall`) + Reverb Wet Mix slider + Decay slider.
   - **Echo Card:** Delay Time slider (50–500 ms) + Feedback slider (0–70%).
   - **Vocal Tone Card:** Presence Clarity slider (-6 dB to +6 dB).

6. **Status Bar Footer:**
   - Engine status: `Active` / `Standby`.
   - Measured audio context sample rate and buffer latency indication.

---

## 5. Storage & Persistence

User preferences are synchronized to `chrome.storage.local` across browser sessions:
```typescript
interface KaraokeSettings {
  preferredDeviceId: string;
  micGain: number;       // default: 1.0
  isMuted: boolean;      // default: false
  reverbPreset: 'dry' | 'room' | 'club' | 'hall' | 'custom';
  reverbMix: number;     // 0.0 - 1.0 (default: 0.30)
  reverbDecay: number;   // 0.2 - 4.0s (default: 1.8)
  delayTime: number;     // 0.05 - 0.5s (default: 0.18)
  delayFeedback: number; // 0.0 - 0.7 (default: 0.25)
  delayMix: number;      // 0.0 - 1.0 (default: 0.20)
  toneClarity: number;   // -6 to +6 dB (default: +2)
}
```

---

## 6. Error Handling & Edge Cases

1. **Microphone Permissions:**
   - If `navigator.mediaDevices.getUserMedia` throws `NotAllowedError` or `PermissionDeniedError`, render an inline configuration card with an explicit "Enable Microphone Access" button and direct instructions on how to toggle permissions in Chrome site settings.
2. **Device Disconnection (Hotplugging):**
   - Bind `navigator.mediaDevices.ondevicechange`. If the active microphone is disconnected, gracefully fallback to the default system microphone without throwing unhandled exceptions.
3. **Audio Context Suspended:**
   - Browsers block auto-starting audio contexts without user interaction. The master power switch acts as the explicit user gesture calling `audioContext.resume()`.
4. **Safety Mute on Error:**
   - If an unexpected DSP graph error occurs, the gain node is clamped to 0 immediately to prevent loud digital artifacts or pops.

---

## 7. Verification & Testing Strategy

1. **DSP Node Verification:**
   - Unit tests for the Reverb impulse response generator verifying buffer length, channel count, decay curve, and absence of NaN/Infinity values.
   - Limiter clamp tests verifying that signals exceeding -6 dB are attenuated according to the compression ratio.
2. **Component Integration:**
   - Test UI state bindings (sliders correctly adjust Web Audio `AudioParam.setTargetAtTime`).
   - Test storage load and save behaviors.
3. **Build & Extension Artifact Verification:**
   - Vite packaging verification ensuring `manifest.json`, `index.html`, compiled scripts, and assets are cleanly generated in `dist/`.
   - Validate Chrome Manifest V3 compliance (no inline scripts, valid icons, valid permissions).
