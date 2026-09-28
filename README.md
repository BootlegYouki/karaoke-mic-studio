# Karaoke Mic Studio

A native, ultra-low latency desktop karaoke microphone monitor and vocal studio built with **Tauri v2**, **Rust** (`cpal`), and **Google Material Design 3 (Material You)**.

Sing along with any music (YouTube, Spotify, instrumental tracks) while monitoring your voice in real-time through your headphones at hardware speeds (<5ms latency), with studio reverb, echo, and safety limiting.

---

## Features

- **Sub-5ms Hardware Latency:** Direct native audio capture and playback via ALSA/PipeWire (Linux) and WASAPI (Windows) using lock-free audio ring buffers.
- **Pure Rust DSP Chain:**
  - **80Hz High-Pass Filter:** Cuts desk thumps, breath pops, and AC rumble.
  - **Dynamic Safety Limiter:** 2ms brickwall limiter clamping signals above -6dB to protect your ears from loud vocal spikes.
  - **Schroeder Reverb:** Diffused room and concert hall acoustic reflection network.
  - **Karaoke Echo:** Damped circular feedback delay line for classic karaoke bounce.
  - **Vocal Tone EQ:** High-shelf presence filter (-6dB warm to +6dB bright).
- **Google Material Design 3 (Material You):**
  - Calm, human tonal surfaces (`surface-container`).
  - Tactile **MD3 Pill Sliders** with value badges.
  - **Reverb Filter Chips:** Connected pill segmented buttons (**[Dry]**, **[Room]**, **[Hall]**).
  - Calm input level meter with decibel telemetry.
  - Zero "vibecoded" clutter, zero neon glows or fake sci-fi grids.
- **System Tray Mode:** Minimizing or closing the window places the app in your system tray so you can sing over full-screen karaoke tracks without window clutter.
- **Cross-Platform:** Available as a native Debian package (`.deb`) for Linux and installer (`.exe` / `.msi`) for Windows.

---

## Keyboard Shortcuts

- **Spacebar:** Quick Mute / Unmute toggle (handy for speaking or coughing between songs).

---

## Downloads & Installation

### Linux
Download the latest `.deb` package from the [GitHub Releases](https://github.com/BootlegYouki/karaoke-mic-studio/releases) page:
```bash
sudo dpkg -i karaoke-mic-studio_*_amd64.deb
```
Or run directly from the portable binary.

### Windows
Download and run the `.exe` or `.msi` installer from the [GitHub Releases](https://github.com/BootlegYouki/karaoke-mic-studio/releases) page.

---

## Development & Building Locally

### Prerequisites
- Node.js 20+
- Rust 1.80+
- Linux build dependencies (if compiling on Linux):
  ```bash
  sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libasound2-dev
  ```

### Commands
```bash
# Install frontend dependencies
npm install

# Run frontend + Rust backend in development mode
npx tauri dev

# Run automated tests (Rust DSP + Frontend M3 components)
cd src-tauri && cargo test && cd .. && npm run test

# Build production binary
npx tauri build
```
