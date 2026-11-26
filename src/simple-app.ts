// Applicazione semplificata con autenticazione e backend
import { api, isAuthenticated, getCurrentUserFromStorage } from './api/client';
import type { User, Post } from './api/repo';

type View = 'home' | 'explore' | 'profile';

interface AppState {
  view: View;
  currentUser: User | null;
  feedTab: 'all' | 'following';
  profileUsername: string | null;
  search: string;
  loading: boolean;
  error: string | null;
}

export class SimpleApp {
  private state: AppState;
  private root: HTMLElement;

  constructor() {
    this.root = document.querySelector('#app')!;
    this.state = {
      view: 'home',
      currentUser: null,
      feedTab: 'all',
      profileUsername: null,
      search: '',
      loading: true,
      error: null,
    };

    this.init();
  }

  private async init() {
    try {
      // Controlla se l'utente è autenticato
      if (isAuthenticated()) {
        this.state.currentUser = getCurrentUserFromStorage();
        await this.loadData();
      } else {
        this.showLoginScreen();
      }
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Errore durante l\'inizializzazione');
    }
  }

  private async loadData() {
    try {
      this.state.loading = true;
      this.render();
      this.state.loading = false;
    } catch (error) {
      console.error('Failed to load data:', error);
      this.state.error = 'Errore nel caricamento dei dati';
      this.state.loading = false;
      this.render();
    }
  }

  private showLoginScreen() {
    this.root.innerHTML = `
      <div class="login-screen">
        <div class="login-container">
          <div class="login-header">
            <img src="./logo.svg" alt="Nebula" class="login-logo">
            <h1>Nebula</h1>
            <p>Il tuo social network su Neon</p>
          </div>
          
          <div class="login-forms">
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
              <button type="submit" class="btn btn-primary btn-block">
                Accedi
              </button>
            </form>

            <form class="auth-form" id="register-form" style="display: none;">
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
              <button type="submit" class="btn btn-primary btn-block">
                Registrati
              </button>
            </form>

            <div class="auth-demo">
              <p>Prova gli account demo:</p>
              <div class="demo-accounts">
                <button class="demo-btn" data-email="aurora@nebula.demo">aurora@nebula.demo</button>
                <button class="demo-btn" data-email="leo@nebula.demo">leo@nebula.demo</button>
                <button class="demo-btn" data-email="mia@nebula.demo">mia@nebula.demo</button>
              </div>
              <p class="demo-note">Usa qualsiasi password per gli account demo</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupAuthHandlers();
  }

  private setupAuthHandlers() {
    // Tab switching
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('auth-tab')) {
        const isLoginTab = target.textContent === 'Login';
        const loginForm = document.querySelector('#login-form')!;
        const registerForm = document.querySelector('#register-form')!;
        
        if (isLoginTab) {
          loginForm.style.display = 'block';
          registerForm.style.display = 'none';
        } else {
          loginForm.style.display = 'none';
          registerForm.style.display = 'block';
        }
      }
      
      if (target.classList.contains('demo-btn')) {
        const email = target.dataset.email;
        if (email) {
          this.handleLogin(email, 'demo123');
        }
      }
    });

    // Form submissions
    document.addEventListener('submit', async (e) => {
      if (e.target.id === 'login-form') {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;
        await this.handleLogin(email, password);
      }
      
      if (e.target.id === 'register-form') {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const username = (form.elements.namedItem('username') as HTMLInputElement).value;
        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;
        await this.handleRegister(username, email, password);
      }
    });
  }

  private async handleLogin(email: string, password: string) {
    this.state.loading = true;
    this.showLoginScreen();

    const response = await api.login(email, password);
    if (response.ok && response.data) {
      this.state.currentUser = response.data.user;
      await this.loadData();
    } else {
      this.state.error = response.error || 'Login failed';
      this.state.loading = false;
      this.showLoginScreen();
    }
  }

  private async handleRegister(username: string, email: string, password: string) {
    this.state.loading = true;
    this.showLoginScreen();

    const response = await api.register(username, email, password);
    if (response.ok && response.data) {
      this.state.currentUser = response.data.user;
      await this.loadData();
    } else {
      this.state.error = response.error || 'Registration failed';
      this.state.loading = false;
      this.showLoginScreen();
    }
  }

  private render() {
    if (!this.state.currentUser) return;

    this.root.innerHTML = this.layout();
    this.setupEventHandlers();
  }

  private layout(): string {
    return `
      <div class="app-container">
        <header class="app-header">
          <div class="header-left">
            <button class="brand" data-action="nav" data-view="home">
              <span class="brand-mark"><img src="./favicon.svg" alt=""></span>
              <span class="brand-word">nebula<span class="brand-dot">.</span></span>
            </button>
          </div>
          <div class="header-center">
            <div class="nav-tabs">
              <button class="nav-tab ${this.state.view === 'home' ? 'active' : ''}" data-action="nav" data-view="home">Home</button>
              <button class="nav-tab ${this.state.view === 'explore' ? 'active' : ''}" data-action="nav" data-view="explore">Esplora</button>
              <button class="nav-tab ${this.state.view === 'profile' ? 'active' : ''}" data-action="nav" data-view="profile">Profilo</button>
            </div>
          </div>
          <div class="header-right">
            <span class="user-info">
              <strong>@${this.state.currentUser.username}</strong>
              <button class="btn btn-sm btn-logout" data-action="logout">Esci</button>
            </span>
          </div>
        </header>

        <main class="app-main">
          ${this.viewContent()}
        </main>
      </div>
    `;
  }

  private viewContent(): string {
    if (this.state.view === 'explore') return this.renderExplore();
    if (this.state.view === 'profile') return this.renderProfile(this.state.profileUsername || this.state.currentUser.username);
    return this.renderHome();
  }

  private async renderHome(): Promise<string> {
    return `
      <div class="home-view">
        <div class="composer">
          <textarea 
            class="composer-input" 
            placeholder="Cosa vuoi condividere, ${this.state.currentUser.username}?"
            maxlength="280"
          ></textarea>
          <div class="composer-actions">
            <button class="btn btn-primary" data-action="post">Pubblica</button>
          </div>
        </div>

        <div class="feed">
          <div class="feed-header">
            <h3>La tua timeline</h3>
          </div>
          <div class="feed-posts">
            <p class="loading-message">Caricando i post...</p>
          </div>
        </div>
      </div>
    `;
  }

  private renderExplore(): string {
    return `
      <div class="explore-view">
        <div class="search-box">
          <input 
            type="text" 
            class="search-input" 
            placeholder="Cerca persone, post o hashtag..."
            value="${this.escapeHtml(this.state.search)}"
          >
        </div>
        <div class="explore-content">
          <div class="loading-message">Caricando i suggerimenti...</div>
        </div>
      </div>
    `;
  }

  private renderProfile(username: string): string {
    return `
      <div class="profile-view">
        <div class="profile-header">
          <h2>Profilo di @${this.escapeHtml(username)}</h2>
        </div>
        <div class="profile-content">
          <div class="loading-message">Caricando il profilo...</div>
        </div>
      </div>
    `;
  }

  private setupEventHandlers() {
    // Navigation
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target.closest('[data-action="nav"]')) {
        const view = target.closest('[data-action="nav"]')?.dataset.view;
        if (view === 'home' || view === 'explore' || view === 'profile') {
          this.state.view = view as View;
          this.state.profileUsername = view === 'profile' ? this.state.currentUser?.username : null;
          this.render();
        }
      }
      
      if (target.closest('[data-action="logout"]')) {
        this.handleLogout();
      }
      
      if (target.closest('[data-action="post"]')) {
        this.handlePost();
      }
    });
  }

  private async handleLogout() {
    await api.logout();
    this.state.currentUser = null;
    this.state.error = null;
    this.showLoginScreen();
  }

  private async handlePost() {
    const textarea = document.querySelector('.composer-input') as HTMLTextAreaElement;
    const content = textarea.value.trim();
    
    if (!content) return;
    
    try {
      const response = await api.createPost(content);
      if (response.ok && response.data) {
        textarea.value = '';
        this.notify('Post pubblicato!');
        this.render();
      } else {
        this.notify('Errore nella pubblicazione', 'error');
      }
    } catch (error) {
      this.notify('Errore nella pubblicazione', 'error');
    }
  }

  private notify(message: string, type: 'success' | 'error' = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  private showError(message: string) {
    this.state.error = message;
    this.render();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app
const app = new SimpleApp();