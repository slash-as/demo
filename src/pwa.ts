/**
 * Gestione del prompt di installazione PWA.
 * Il browser decide quando l'app è installabile e lancia
 * `beforeinstallprompt`; noi conserviamo l'evento per il pulsante "Installa".
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let notifyChange: (() => void) | null = null;
let initialized = false;

export function initPwaInstall(onChange: () => void): void {
  notifyChange = onChange;

  if (initialized) return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyChange?.();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyChange?.();
  });
}

export function canInstall(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';

  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notifyChange?.();

  return choice.outcome;
}
