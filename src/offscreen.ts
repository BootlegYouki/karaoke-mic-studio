import { AudioEngine } from './audio/AudioEngine';
import { KaraokeSettings } from './audio/types';

const engine = new AudioEngine();

// Handle device disconnects
engine.onTrackEnded(() => {
  engine.stop();
  chrome.runtime.sendMessage({ type: 'MIC_DISCONNECTED' }).catch(() => {});
});

// 1. Command Message Handler
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_MIC') {
    engine
      .start(message.deviceId || undefined, message.settings)
      .then(() => {
        sendResponse({
          success: true,
          isActive: engine.getIsActive(),
          telemetry: engine.getTelemetry(),
        });
      })
      .catch((err) => {
        console.error('Offscreen AudioEngine start failed:', err);
        sendResponse({
          success: false,
          error: err.name || err.message || 'StartError',
        });
      });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'STOP_MIC') {
    engine.stop();
    sendResponse({
      success: true,
      isActive: false,
      telemetry: engine.getTelemetry(),
    });
    return true;
  }

  if (message.type === 'UPDATE_SETTINGS') {
    const s: KaraokeSettings = message.settings;
    if (engine.getIsActive()) {
      engine.setMicGain(s.micGain);
      engine.setMute(s.isMuted);
      engine.setReverb(s.reverbPreset, s.reverbMix, s.reverbDecay);
      engine.setDelay(s.delayTime, s.delayFeedback, s.delayMix);
      engine.setTone(s.toneClarity);
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_STATE') {
    sendResponse({
      isActive: engine.getIsActive(),
      telemetry: engine.getTelemetry(),
    });
    return true;
  }
});

// 2. High-performance Visualizer Streaming Port
// When Side Panel opens, it connects a port. When Side Panel closes, port disconnects.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'visualizer') return;

  let timerId: number | null = null;
  const analyser = engine.getAnalyser();

  if (analyser) {
    const bufferLength = analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);

    timerId = window.setInterval(() => {
      if (!engine.getIsActive()) {
        port.postMessage({ isActive: false });
        return;
      }

      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(freqData);

      try {
        port.postMessage({
          isActive: true,
          timeData: Array.from(timeData),
          freqData: Array.from(freqData),
        });
      } catch {
        // Port disconnected
        if (timerId !== null) clearInterval(timerId);
      }
    }, 33); // ~30 FPS is silky smooth and lightweight for the visualizer
  }

  port.onDisconnect.addListener(() => {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  });
});

export {};
