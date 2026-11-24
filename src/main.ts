import '@fontsource-variable/manrope';
import '@fontsource-variable/space-grotesk';
import './styles.css';

import { flushDatabase, openDatabase } from './db/database';
import { listUsers } from './db/repo';
import { initPwaInstall } from './pwa';
import { App } from './ui/app';

const ME_STORAGE_KEY = 'nebula:me';

/**
 * Le immagini caricate dall'utente possono essere rotte:
 * le nascondiamo per lasciare visibile l'avatar di fallback.
 */
document.addEventListener(
  'error',
  (event) => {
    if (event.target instanceof HTMLImageElement) {
      event.target.classList.add('is-broken');
    }
  },
  true,
);

function hideBootScreen(): void {
  const boot = document.getElementById('boot');
  if (!boot) return;

  boot.classList.add('is-hidden');
  window.setTimeout(() => boot.remove(), 450);
}

function showBootError(error: unknown): void {
  const boot = document.getElementById('boot');
  if (!boot) return;

  boot.innerHTML = '';

  const orb = document.createElement('div');
  orb.className = 'boot-orb';
  orb.setAttribute('aria-hidden', 'true');

  const title = document.createElement('p');
  title.className = 'boot-name';
  title.textContent = 'Qualcosa è andato storto';

  const copy = document.createElement('p');
  copy.className = 'boot-error';
  copy.textContent =
    error instanceof Error
      ? error.message
      : 'Impossibile avviare il database locale. Se è la prima visita, serve una connessione per scaricare SQLite.';

  const retry = document.createElement('button');
  retry.className = 'boot-retry';
  retry.type = 'button';
  retry.textContent = 'Riprova';
  retry.addEventListener('click', () => window.location.reload());

  boot.append(orb, title, copy, retry);
}

async function boot(): Promise<void> {
  await openDatabase();

  const users = listUsers();
  if (!users.length) throw new Error('Nessun utente demo nel database.');

  const stored = Number(localStorage.getItem(ME_STORAGE_KEY));
  const meId = users.some((user) => user.id === stored) ? stored : users[0].id;
  localStorage.setItem(ME_STORAGE_KEY, String(meId));

  const app = new App(meId);
  app.mount();

  initPwaInstall(() => app.refresh());

  window.addEventListener('online', () => app.syncNetwork());
  window.addEventListener('offline', () => app.syncNetwork());
  window.addEventListener('pagehide', () => {
    void flushDatabase();
  });

  hideBootScreen();

  if (import.meta.env.PROD) {
    void import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({ immediate: true });
      })
      .catch((error: unknown) => {
        console.error('[Nebula] Registrazione service worker fallita', error);
      });
  }
}

void boot().catch((error: unknown) => {
  console.error(error);
  showBootError(error);
});
