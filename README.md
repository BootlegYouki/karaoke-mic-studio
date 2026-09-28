# Karaoke Mic Studio (Chrome Extension)

A low-latency live microphone monitor and vocal effects studio built for Chrome (Manifest V3). It runs in the Chrome Side Panel so you can sing karaoke along with any music video (YouTube, Spotify Web, Karaoke Version, etc.) in your browser while hearing your own voice through your headphones in real-time.

---

## Features

- **Direct Vocal Monitoring:** Routes your microphone to your headphones with interactive low latency (~10–15ms).
- **Singing-Tuned Audio:** Disables telephone voice filters (noise suppression, echo cancellation, auto-gain) so sustaining notes, vibrato, and full musical dynamics are preserved.
- **Dynamic Safety Limiter:** 2ms fast-attack `DynamicsCompressorNode` acts as a brickwall limiter to prevent digital clipping or ear fatigue when hitting loud notes.
- **Studio Algorithmic Reverb:** Instant in-memory impulse responses for presets (`Dry`, `Cozy Room`, `Karaoke Club`, `Concert Hall`) plus Wet Mix and Decay sliders.
- **Karaoke Echo (Delay):** Feedback delay line with warm 2.8kHz low-pass damping for classic karaoke echo.
- **Vocal Tone EQ:** High-shelf clarity booster/cut (-6dB to +6dB) for airy studio presence.
- **Real-Time Visualizer & Peak VU Meter:** 60 FPS Canvas oscilloscope waveform / frequency spectrum and segmented peak level meter with clipping warning.
- **Side Panel Integration:** Stays docked next to your YouTube or music tab without disappearing when you click on the video.
- **Hardware Hotplugging:** Automatically detects connected USB microphones and headsets.
- **Pro-Audio Aesthetic:** Tactile dark zinc studio design using Lucide icons—no generic AI slop or emojis.

---

## How to Install in Google Chrome

1. **Build the extension** (if not already built):
   ```bash
   npm install
   npm run build
   ```
   This generates the production bundle in the `dist/` directory.

2. **Open Extensions in Chrome:**
   - In Google Chrome, navigate to: `chrome://extensions/`
   - Enable **Developer mode** using the toggle in the top-right corner.

3. **Load Unpacked:**
   - Click the **"Load unpacked"** button in the top-left corner.
   - Select the `dist/` directory inside this project:  
     `/home/youki/Projects/karaoke-mic-extension/dist`

4. **Pin & Open:**
   - Click the puzzle piece icon in Chrome's toolbar and pin **Karaoke Mic Studio**.
   - Click the icon anytime: it will open the docked **Side Panel** on the right side of your browser.

---

## Recommended Singing Setup

1. **Plug in Headphones / Headset:**  
   Always wear headphones or earphones when singing with live microphone monitoring. Open laptop or desktop speakers will cause acoustic feedback loops (howling screech) into the mic.
2. **Open Your Karaoke Video:**  
   Open YouTube in any tab (e.g. search for `"Don't Stop Believin' karaoke"` or `"Bohemian Rhapsody instrumental"`).
3. **Turn On Monitor:**  
   In the Karaoke Mic Studio side panel, click **START MIC**. Allow microphone permissions when prompted by Chrome.
4. **Dial in Your Effects:**  
   - Select **Karaoke Club** or **Concert Hall** reverb.
   - Adjust the **Echo Delay** to ~180ms for that authentic karaoke vocal bounce.
   - Sing away!

---

## Keyboard Shortcuts

- **Spacebar:** Quick Mute / Unmute toggle (handy for coughing or speaking between songs).

---

## Development & Testing

- `npm run dev`: Starts local Vite development server.
- `npm run build`: Type-checks and compiles the extension to `dist/`.
- `npm run test`: Executes the complete Vitest test suite (DSP nodes, storage, visualizer, UI components, manifest).
