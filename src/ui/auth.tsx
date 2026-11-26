// Componente di autenticazione
import { authManager } from '../api/client';

interface AuthState {
  user: any | null;
  loading: boolean;
  error: string | null;
}

class AuthManager {
  private state: AuthState = {
    user: null,
    loading: false,
    error: null,
  };

  private listeners: Array<(state: AuthState) => void> = [];

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  getState(): AuthState {
    return { ...this.state };
  }

  async login(email: string, password: string): Promise<boolean> {
    this.state.loading = true;
    this.state.error = null;
    this.notify();

    try {
      const response = await authManager.login(email, password);
      if (response.ok && response.data) {
        this.state.user = response.data.user;
        this.state.loading = false;
        this.notify();
        return true;
      } else {
        this.state.error = response.error || 'Login failed';
        this.state.loading = false;
        this.notify();
        return false;
      }
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Login failed';
      this.state.loading = false;
      this.notify();
      return false;
    }
  }

  async register(username: string, email: string, password: string): Promise<boolean> {
    this.state.loading = true;
    this.state.error = null;
    this.notify();

    try {
      const response = await authManager.register(username, email, password);
      if (response.ok && response.data) {
        this.state.user = response.data.user;
        this.state.loading = false;
        this.notify();
        return true;
      } else {
        this.state.error = response.error || 'Registration failed';
        this.state.loading = false;
        this.notify();
        return false;
      }
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Registration failed';
      this.state.loading = false;
      this.notify();
      return false;
    }
  }

  async logout(): Promise<void> {
    await authManager.logout();
    this.state.user = null;
    this.state.error = null;
    this.notify();
  }

  async checkAuth(): Promise<boolean> {
    if (!authManager.isAuthenticated()) {
      this.state.user = null;
      this.notify();
      return false;
    }

    try {
      const response = await authManager.getCurrentUser();
      if (response.ok && response.data) {
        this.state.user = response.data;
        this.notify();
        return true;
      } else {
        // Token non valido, logout
        await this.logout();
        return false;
      }
    } catch (error) {
      await this.logout();
      return false;
    }
  }
}

export const authManager = new AuthManager();

// Helper per formattare le date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Renderizza il componente di autenticazione
export function renderAuthModal(): string {
  const state = authManager.getState();
  
  return `
    <div class="modal-backdrop" data-action="close-auth-modal">
      <div class="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" data-action="noop">
        <header class="modal-head">
          <div>
            <span class="eyebrow">Benvenuto su Nebula</span>
            <h2 id="auth-modal-title">${state.user ? 'Il tuo profilo' : 'Accedi o registrati'}</h2>
          </div>
          <button class="icon-btn" data-action="close-auth-modal" aria-label="Chiudi">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div class="auth-content">
          ${state.user ? renderUserProfile(state.user) : renderAuthForms()}
        </div>
      </div>
    </div>
  `;
}

function renderUserProfile(user: any): string {
  return `
    <div class="user-profile">
      <div class="profile-avatar">
        <img src="${escapeHtml(user.avatar_url || `https://ui-avatars.com/api/?name=${escapeHtml(user.username)}&background=6366f1&color=fff`)}" 
             alt="${escapeHtml(user.username)}" 
             class="avatar-img">
      </div>
      <div class="profile-info">
        <h3>${escapeHtml(user.username)}</h3>
        <p class="user-email">${escapeHtml(user.email)}</p>
        <p class="user-bio">${escapeHtml(user.bio || 'Nessuna bio')}</p>
        <p class="user-joined">Su Nebula da ${formatDate(user.created_at)}</p>
      </div>
      <div class="profile-actions">
        <button class="btn btn-primary btn-block" data-action="logout">Esci</button>
      </div>
    </div>
  `;
}

function renderAuthForms(): string {
  return `
    <div class="auth-forms">
      <div class="auth-tabs">
        <button class="auth-tab is-active" data-action="login-tab">Login</button>
        <button class="auth-tab" data-action="register-tab">Registrati</button>
      </div>

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
      
      ${authManager.getState().error ? `<div class="auth-error">${escapeHtml(authManager.getState().error)}</div>` : ''}
      
      ${authManager.getState().loading ? '<div class="auth-loading">Caricamento...</div>' : ''}
      
      <div class="auth-demo">
        <p>Oppure prova gli account demo:</p>
        <div class="demo-accounts">
          <button class="demo-btn" data-email="aurora@nebula.demo">aurora@nebula.demo</button>
          <button class="demo-btn" data-email="leo@nebula.demo">leo@nebula.demo</button>
          <button class="demo-btn" data-email="mia@nebula.demo">mia@nebula.demo</button>
        </div>
        <p class="demo-note">Usa qualsiasi password per gli account demo</p>
      </div>
    </div>
  `;
}

// Helper functions
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Gestione eventi per il modal di autenticazione
export function setupAuthModal(): void {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    
    // Chiudi modal
    if (target.closest('[data-action="close-auth-modal"]')) {
      document.querySelector('.auth-modal')?.remove();
      return;
    }
    
    // Switch tra login e registrazione
    if (target.closest('[data-action="login-tab"]')) {
      document.querySelector('#login-form')!.style.display = 'block';
      document.querySelector('#register-form')!.style.display = 'none';
      return;
    }
    
    if (target.closest('[data-action="register-tab"]')) {
      document.querySelector('#login-form')!.style.display = 'none';
      document.querySelector('#register-form')!.style.display = 'block';
      return;
    }
    
    // Login con demo account
    if (target.closest('.demo-btn')) {
      const email = target.closest('.demo-btn')?.dataset.email;
      if (email) {
        // Prova login con demo account
        authManager.login(email, 'demo123').then(success => {
          if (success) {
            document.querySelector('.auth-modal')?.remove();
          }
        });
      }
      return;
    }
    
    // Logout
    if (target.closest('[data-action="logout"]')) {
      authManager.logout().then(() => {
        document.querySelector('.auth-modal')?.remove();
      });
      return;
    }
  });
  
  // Gestione submit form
  document.addEventListener('submit', (event) => {
    if (event.target.id === 'login-form') {
      event.preventDefault();
      const form = event.target as HTMLFormElement;
      const email = (form.elements.namedItem('email') as HTMLInputElement).value;
      const password = (form.elements.namedItem('password') as HTMLInputElement).value;
      
      authManager.login(email, password).then(success => {
        if (success) {
          document.querySelector('.auth-modal')?.remove();
        }
      });
    }
    
    if (event.target.id === 'register-form') {
      event.preventDefault();
      const form = event.target as HTMLFormElement;
      const username = (form.elements.namedItem('username') as HTMLInputElement).value;
      const email = (form.elements.namedItem('email') as HTMLInputElement).value;
      const password = (form.elements.namedItem('password') as HTMLInputElement).value;
      
      authManager.register(username, email, password).then(success => {
        if (success) {
          document.querySelector('.auth-modal')?.remove();
        }
      });
    }
  });
}