import '@fontsource-variable/manrope';
import '@fontsource-variable/space-grotesk';
import './styles.css';

import { apiClient } from './api/client';
import { icon } from './ui/icons';
import { initPwaInstall } from './pwa';
import { App } from './ui/app';
import { ThemeToggle } from './ui/theme-toggle';

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
      : 'Impossibile connettersi al backend Neon. Controlla la connessione e riprova.';

  const retry = document.createElement('button');
  retry.className = 'boot-retry';
  retry.type = 'button';
  retry.textContent = 'Riprova';
  retry.addEventListener('click', () => window.location.reload());

  boot.append(orb, title, copy, retry);
}

function showLoginScreen(): void {
  const boot = document.getElementById('boot');
  if (!boot) return;

  boot.innerHTML = '';

  const orb = document.createElement('div');
  orb.className = 'boot-orb';
  orb.setAttribute('aria-hidden', 'true');

  const title = document.createElement('p');
  title.className = 'boot-name';
  title.textContent = 'Nebula - Accesso';

  const loginForm = document.createElement('form');
  loginForm.className = 'login-form';
  loginForm.innerHTML = `
    <div class="field">
      <label>Email o Username</label>
      <input type="text" name="identifier" required placeholder="email@example.com o username">
    </div>
    <div class="field">
      <label>Password</label>
      <input type="password" name="password" required placeholder="••••••••">
    </div>
    <div class="login-actions">
      <button type="submit" class="btn btn-primary">Accedi</button>
      <button type="button" class="btn btn-ghost" id="signup-btn">Registrati</button>
    </div>
  `;

  const errorDiv = document.createElement('div');
  errorDiv.className = 'login-error';
  errorDiv.style.display = 'none';

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const identifier = formData.get('identifier') as string;
    const password = formData.get('password') as string;

    try {
      const result = await apiClient.signIn(identifier, password);
      if (result.success) {
        window.location.reload();
      }
    } catch (err) {
      errorDiv.textContent = 'Email/Username o password non validi';
      errorDiv.style.display = 'block';
    }
  });

  const signupBtn = loginForm.querySelector('#signup-btn') as HTMLButtonElement;
  signupBtn.addEventListener('click', () => {
    const identifier = (loginForm.querySelector('input[name="identifier"]') as HTMLInputElement).value;
    const password = (loginForm.querySelector('input[name="password"]') as HTMLInputElement).value;
    
    if (identifier && password) {
      // Assume che l'input sia un'email per la registrazione
      showSignupForm(identifier, password);
    }
  });

  boot.append(orb, title, loginForm, errorDiv);
}

function showSignupForm(email: string, password: string): void {
  const boot = document.getElementById('boot');
  if (!boot) return;

  boot.innerHTML = '';

  const orb = document.createElement('div');
  orb.className = 'boot-orb';
  orb.setAttribute('aria-hidden', 'true');

  const title = document.createElement('p');
  title.className = 'boot-name';
  title.textContent = 'Nebula - Registrazione';

  const signupForm = document.createElement('form');
  signupForm.className = 'login-form';
  signupForm.innerHTML = `
    <div class="field">
      <label>Email</label>
      <input type="email" name="email" value="${email}" required placeholder="email@example.com">
    </div>
    <div class="field">
      <label>Password</label>
      <input type="password" name="password" value="${password}" required placeholder="••••••••">
    </div>
    <div class="field">
      <label>Username</label>
      <input type="text" name="username" required placeholder="username">
    </div>
    <div class="login-actions">
      <button type="submit" class="btn btn-primary">Registrati</button>
      <button type="button" class="btn btn-ghost" id="back-to-login">Indietro</button>
    </div>
  `;

  const errorDiv = document.createElement('div');
  errorDiv.className = 'login-error';
  errorDiv.style.display = 'none';

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(signupForm);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const username = formData.get('username') as string;

    try {
      const result = await apiClient.signUp(email, password, username);
      if (result.success) {
        window.location.reload();
      }
    } catch (err) {
      errorDiv.textContent = 'Registrazione fallita. L\'email potrebbe essere già usata.';
      errorDiv.style.display = 'block';
    }
  });

  const backBtn = signupForm.querySelector('#back-to-login') as HTMLButtonElement;
  backBtn.addEventListener('click', () => showLoginScreen());

  boot.append(orb, title, signupForm, errorDiv);
}

// Funzione per mostrare il pulsante di logout e il toggle del tema nell'header
function addLogoutButton(): void {
  const accountButton = document.querySelector('.account-button');
  if (!accountButton) return;

  // Aggiungi il pulsante di logout solo se non esiste già
  if (!accountButton.querySelector('.logout-btn')) {
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-ghost btn-sm logout-btn';
    logoutBtn.innerHTML = `${icon('logout', 14)} Esci`;
    logoutBtn.style.marginTop = '8px';
    logoutBtn.addEventListener('click', async () => {
      try {
        await apiClient.signOut();
        localStorage.removeItem('nebula:me');
        localStorage.removeItem('nebula:token');
        window.location.reload();
      } catch (error) {
        console.error('Logout fallito:', error);
        localStorage.removeItem('nebula:me');
        localStorage.removeItem('nebula:token');
        window.location.reload();
      }
    });

    // Inserisci il pulsante prima dell'elemento esistente
    accountButton.insertBefore(logoutBtn, accountButton.firstChild);
  }

  // Aggiungi il toggle del tema
  const themeToggle = new ThemeToggle();
  const themeButton = themeToggle.render();
  themeButton.className = 'btn btn-ghost btn-sm theme-btn';
  themeButton.style.marginTop = '8px';
  themeButton.style.marginLeft = '8px';
  
  // Inserisci il pulsante del tema dopo il pulsante di logout
  const logoutBtn = accountButton.querySelector('.logout-btn');
  if (logoutBtn) {
    accountButton.insertBefore(themeButton, logoutBtn.nextSibling);
  } else {
    // Se non c'è il pulsante di logout, aggiungi il tema alla fine
    accountButton.appendChild(themeButton);
  }
}

async function boot(): Promise<void> {
  try {
    // Prova a caricare lo snapshot dal backend
    const snapshot = await apiClient.loadSnapshot();
    
    if (!snapshot.me) {
      // Utente non autenticato, mostra schermata di login
      showLoginScreen();
      return;
    }

    // Utente autenticato, salva i dati e avvia l'app
    localStorage.setItem(ME_STORAGE_KEY, String(snapshot.me.id));

    const app = new App(snapshot);
    app.mount();

    // Aggiungi il pulsante di logout
    addLogoutButton();

    initPwaInstall(() => app.refresh());

    // Gestione eventi di rete (non più necessari per il sync locale)
    window.addEventListener('online', () => app.refresh());
    window.addEventListener('offline', () => app.refresh());

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
  } catch (error) {
    console.error('Boot error:', error);
    
    // For deployed version, if we get a 404, show login screen
    if (window.location.hostname === 'slash-as.github.io') {
      showLoginScreen();
    } else if (error instanceof Error && error.message.includes('Authentication required')) {
      // Utente non autenticato, mostra schermata di login
      showLoginScreen();
    } else {
      // Altri errori di connessione
      console.error(error);
      showBootError(error);
    }
  }
}

void boot().catch((error: unknown) => {
  console.error(error);
  showBootError(error);
});
