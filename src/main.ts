// Main entry point per Nebula con autenticazione
import { App } from './ui/app';
import { authManager, setupAuthModal } from './ui/auth';
import { repo } from './api/repo';
import { icon } from './ui/icons';

// Inizializzazione
async function init() {
  // Controlla l'autenticazione all'avvio
  const isAuthenticated = await authManager.checkAuth();
  
  // Setup event listeners
  setupAuthModal();
  
  // Setup bottone di login nell'header
  setupLoginButton();
  
  // Inizializza l'app se l'utente è autenticato, altrimenti mostra la schermata di login
  if (isAuthenticated) {
    initializeApp();
  } else {
    showLoginScreen();
  }
}

function setupLoginButton() {
  // Aggiungi un pulsante di login nell'header se non esiste
  const existingButton = document.querySelector('[data-action="show-login"]');
  if (!existingButton) {
    const header = document.querySelector('.mobile-topbar') || document.querySelector('.sidebar');
    if (header) {
      const loginButton = document.createElement('button');
      loginButton.className = 'btn btn-ghost btn-sm login-btn';
      loginButton.setAttribute('data-action', 'show-login');
      loginButton.innerHTML = `${icon('user', 16)} Login`;
      header.appendChild(loginButton);
    }
  }
  
  // Event listener per il pulsante di login
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-action="show-login"]')) {
      showAuthModal();
    }
  });
}

function showAuthModal() {
  const modal = document.createElement('div');
  modal.innerHTML = renderAuthModal();
  document.body.appendChild(modal);
  
  // Focus sul primo input
  setTimeout(() => {
    modal.querySelector('input')?.focus();
  }, 100);
}

function showLoginScreen() {
  const app = document.getElementById('app');
  if (!app) return;
  
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-container">
        <div class="login-header">
          <img src="./logo.svg" alt="Nebula" class="login-logo">
          <h1>Nebula</h1>
          <p>Il tuo social network su Neon</p>
        </div>
        
        <div class="login-forms">
          <div class="auth-tabs">
            <button class="auth-tab ${!authManager.getState().registerMode ? 'is-active' : ''}" data-action="login-tab">Login</button>
            <button class="auth-tab ${authManager.getState().registerMode ? 'is-active' : ''}" data-action="register-tab">Registrati</button>
          </div>

          ${authManager.getState().registerMode ? renderRegisterForm() : renderLoginForm()}
          
          ${authManager.getState().error ? `<div class="auth-error">${escapeHtml(authManager.getState().error)}</div>` : ''}
          
          ${authManager.getState().loading ? '<div class="auth-loading">Caricamento...</div>' : ''}
        </div>
        
        <div class="login-footer">
          <p>Prova gli account demo:</p>
          <div class="demo-accounts">
            <button class="demo-btn" data-email="aurora@nebula.demo">aurora@nebula.demo</button>
            <button class="demo-btn" data-email="leo@nebula.demo">leo@nebula.demo</button>
            <button class="demo-btn" data-email="mia@nebula.demo">mia@nebula.demo</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Setup form handlers
  setupFormHandlers();
}

function renderLoginForm(): string {
  return `
    <form class="auth-form" id="login-form">
      <div class="form-group">
        <label for="login-email">Email</label>
        <input type="email" id="login-email" name="email" required autocomplete="email">
      </div>
      <div class="form-group">
        <label for="login-password">Password</label>
        <input type="password" id="login-password" name="password" required autocomplete="current-password">
      </div>
      <button type="submit" class="btn btn-primary btn-block" ${authManager.getState().loading ? 'disabled' : ''}>
        Accedi
      </button>
    </form>
  `;
}

function renderRegisterForm(): string {
  return `
    <form class="auth-form" id="register-form">
      <div class="form-group">
        <label for="register-username">Username</label>
        <input type="text" id="register-username" name="username" required minlength="3" maxlength="20">
      </div>
      <div class="form-group">
        <label for="register-email">Email</label>
        <input type="email" id="register-email" name="email" required autocomplete="email">
      </div>
      <div class="form-group">
        <label for="register-password">Password</label>
        <input type="password" id="register-password" name="password" required minlength="6">
      </div>
      <button type="submit" class="btn btn-primary btn-block" ${authManager.getState().loading ? 'disabled' : ''}>
        Registrati
      </button>
    </form>
  `;
}

function setupFormHandlers() {
  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (loginForm.elements.namedItem('email') as HTMLInputElement).value;
      const password = (loginForm.elements.namedItem('password') as HTMLInputElement).value;
      
      const success = await authManager.login(email, password);
      if (success) {
        initializeApp();
      }
    });
  }
  
  // Register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = (registerForm.elements.namedItem('username') as HTMLInputElement).value;
      const email = (registerForm.elements.namedItem('email') as HTMLInputElement).value;
      const password = (registerForm.elements.namedItem('password') as HTMLInputElement).value;
      
      const success = await authManager.register(username, email, password);
      if (success) {
        initializeApp();
      }
    });
  }
  
  // Demo accounts
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('demo-btn')) {
      const email = target.dataset.email;
      if (email) {
        authManager.login(email, 'demo123').then(success => {
          if (success) {
            initializeApp();
          }
        });
      }
    }
    
    // Tab switching
    if (target.classList.contains('auth-tab')) {
      const isRegisterTab = target.textContent === 'Registrati';
      authManager.setState({ ...authManager.getState(), registerMode: isRegisterTab });
      
      // Re-render the form
      if (isRegisterTab) {
        document.querySelector('.auth-forms')!.innerHTML = renderRegisterForm();
      } else {
        document.querySelector('.auth-forms')!.innerHTML = renderLoginForm();
      }
      
      // Re-setup form handlers
      setupFormHandlers();
    }
  });
}

function initializeApp() {
  const currentUser = authManager.getState().user;
  if (!currentUser) {
    showLoginScreen();
    return;
  }
  
  // Inizializza l'app con l'utente corrente
  const app = new App(currentUser.id);
  app.mount();
  
  // Aggiorna l'UI per mostrare l'utente autenticato
  updateAuthUI(currentUser);
}

function updateAuthUI(user: any) {
  // Rimuovi schermata di login se presente
  const loginScreen = document.querySelector('.login-screen');
  if (loginScreen) {
    loginScreen.remove();
  }
  
  // Aggiorna il pulsante di login nell'header
  const loginBtn = document.querySelector('.login-btn');
  if (loginBtn) {
    loginBtn.innerHTML = `${icon('user', 16)} @${user.username}`;
    loginBtn.setAttribute('data-action', 'show-profile');
  }
}

// Helper functions
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Gestione errori globali
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Avvia l'applicazione
init().catch(console.error);