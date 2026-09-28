const requestBtn = document.getElementById('request-mic-btn') as HTMLButtonElement | null;
const statusContainer = document.getElementById('status-container') as HTMLDivElement | null;

async function requestPermission() {
  if (!statusContainer || !requestBtn) return;

  requestBtn.disabled = true;
  requestBtn.textContent = 'Requesting access...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop tracks immediately after permission is granted
    stream.getTracks().forEach((track) => track.stop());

    statusContainer.className =
      'text-xs font-mono p-3 rounded border bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
    statusContainer.innerHTML =
      '<strong>Access Granted!</strong> You can now close this tab and return to the Side Panel.';
    statusContainer.classList.remove('hidden');

    requestBtn.textContent = 'Permission Granted';
    requestBtn.className =
      'w-full py-2.5 px-4 bg-emerald-500 text-zinc-950 font-mono text-xs font-semibold rounded-lg';

    // Auto close tab after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);
  } catch (err: any) {
    console.error('Permission request failed:', err);
    requestBtn.disabled = false;
    requestBtn.textContent = 'Retry Granting Microphone';

    statusContainer.className =
      'text-xs font-mono p-3 rounded border bg-rose-500/10 border-rose-500/30 text-rose-300';
    statusContainer.textContent = `Permission denied: ${err.name || err.message}. Please click the lock icon in the address bar to allow microphone.`;
    statusContainer.classList.remove('hidden');
  }
}

requestBtn?.addEventListener('click', requestPermission);

// Trigger request on load
requestPermission();

export {};
