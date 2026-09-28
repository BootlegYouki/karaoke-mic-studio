// Background service worker for Chrome Extension (Manifest V3)

// Configure Chrome Side Panel to open automatically when clicking the extension icon
if (typeof chrome !== 'undefined' && chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => {
      console.error('Failed to configure side panel behavior:', error);
    });
}

// Manage creation of the persistent offscreen audio processing document
export async function ensureOffscreenDocument(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.offscreen) return;

  const hasDoc = await chrome.offscreen.hasDocument?.();
  if (!hasDoc) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Continuous karaoke microphone live monitoring',
    });
  }
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'ENSURE_OFFSCREEN') {
      ensureOffscreenDocument()
        .then(() => sendResponse({ ready: true }))
        .catch((err) => sendResponse({ ready: false, error: err.message }));
      return true;
    }
  });
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    console.log('Karaoke Mic Studio extension active.');
  });
}

export {};
