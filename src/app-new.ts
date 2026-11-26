// Nuova versione dell'app con autenticazione e API backend
import { apiDatabase } from './api/database';
import { authManager } from './ui/auth';
import { icon } from './ui/icons';
import type { User, Post, Comment } from './api/repo';

type View = 'home' | 'explore' | 'profile';
type ToastTone = 'success' | 'info' | 'error';

interface AppState {
  view: View;
  currentUser: User | null;
  feedTab: 'all' | 'following';
  profileUsername: string | null;
  commentsOpen: Set<number>;
  drafts: Map<string, string>;
  mediaOpen: boolean;
  search: string;
  loading: boolean;
  error: string | null;
}

export class NebulaApp {
  private state: AppState;
  private root: HTMLElement;

  constructor() {
    this.root = document.querySelector('#app')!;
    this.state = {
      view: 'home',
      currentUser: null,
      feedTab: 'all',
      profileUsername: null,
      commentsOpen: new Set(),
      drafts: new Map(),
      mediaOpen: false,
      search: '',
      loading: true,
      error: null,
    };

    this.init();
  }

  private async init() {
    try {
      // Controlla se l'utente è autenticato
      const isAuthenticated = await authManager.checkAuth();
      
      if (isAuthenticated) {
        this.state.currentUser = authManager.getState().user;
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
      await apiDatabase.refresh();
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
              <button class="auth-tab ${!this.state.registerMode ? 'is-active' : ''}" data-action="login-tab">Login</button>
              <button class="auth-tab ${this.state.registerMode ? 'is-active' : ''}" data-action="register-tab">Registrati</button>
            </div>

            ${this.state.registerMode ? this.renderRegisterForm() : this.renderLoginForm()}
            
            ${this.state.error ? `<div class="auth-error">${this.escapeHtml(this.state.error)}</div>` : ''}
            
            ${this.state.loading ? '<div class="auth-loading">Caricamento...</div>' : ''}
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

    this.setupAuthHandlers();
  }

  private renderLoginForm(): string {
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
        <button type="submit" class="btn btn-primary btn-block" ${this.state.loading ? 'disabled' : ''}>
          Accedi
        </button>
      </form>
    `;
  }

  private renderRegisterForm(): string {
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
        <button type="submit" class="btn btn-primary btn-block" ${this.state.loading ? 'disabled' : ''}>
          Registrati
        </button>
      </form>
    `;
  }

  private setupAuthHandlers() {
    // Tab switching
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('auth-tab')) {
        const isRegisterTab = target.textContent === 'Registrati';
        this.state.registerMode = isRegisterTab;
        this.showLoginScreen();
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
    this.state.error = null;
    this.showLoginScreen();

    const success = await authManager.login(email, password);
    if (success) {
      this.state.currentUser = authManager.getState().user;
      await this.loadData();
    } else {
      this.state.error = authManager.getState().error || 'Login failed';
      this.state.loading = false;
      this.showLoginScreen();
    }
  }

  private async handleRegister(username: string, email: string, password: string) {
    this.state.loading = true;
    this.state.error = null;
    this.showLoginScreen();

    const success = await authManager.register(username, email, password);
    if (success) {
      this.state.currentUser = authManager.getState().user;
      await this.loadData();
    } else {
      this.state.error = authManager.getState().error || 'Registration failed';
      this.state.loading = false;
      this.showLoginScreen();
    }
  }

  private render() {
    if (!this.state.currentUser) return;

    this.root.innerHTML = this.layout();
  }

  private layout(): string {
    return `
      ${this.mobileTopbar()}
      <div class="shell">
        ${this.sidebar()}
        <main class="main" id="main">
          ${this.viewContent()}
        </main>
        ${this.rail()}
      </div>
      ${this.mobileNav()}
    `;
  }

  private viewContent(): string {
    if (this.state.view === 'explore') return this.renderExplore();
    if (this.state.view === 'profile') {
      return this.renderProfile(this.state.profileUsername ?? this.state.currentUser!.username);
    }
    return this.renderHome();
  }

  private async renderHome(): Promise<string> {
    const posts = await apiDatabase.listFeed(this.state.currentUser!.id, this.state.feedTab);
    const stats = await apiDatabase.getStats();

    return `
      <header class="view-head">
        <div>
          <span class="eyebrow">Benvenuto, ${this.escapeHtml(this.state.currentUser!.username)}</span>
          <h1>La tua <span class="grad-text">orbita</span></h1>
          <p>La timeline del social network. Connesso con il backend su Neon.</p>
        </div>
        <div class="live-pill"><span class="live-dot"></span> ${stats.posts} post live</div>
      </header>

      ${this.composer()}

      <div class="feed-toolbar">
        <div class="segmented" role="tablist" aria-label="Filtra la timeline">
          <button class="${this.state.feedTab === 'all' ? 'is-active' : ''}" data-action="feed-tab" data-tab="all" role="tab" aria-selected="${this.state.feedTab === 'all'}">Per te</button>
          <button class="${this.state.feedTab === 'following' ? 'is-active' : ''}" data-action="feed-tab" data-tab="following" role="tab" aria-selected="${this.state.feedTab === 'following'}">Seguiti</button>
        </div>
        <span class="muted">${posts.length} ${posts.length === 1 ? 'post' : 'post'}</span>
      </div>

      <div class="feed">
        ${
          posts.length
            ? posts.map((post, index) => this.postCard(post, index)).join('')
            : this.emptyState(
                'users',
                'La tua rete è silenziosa',
                'Segui qualcuno o pubblica il primo post per riempire questa orbita.',
                `<button class="btn btn-primary btn-sm" data-action="nav" data-view="explore">Esplora persone</button>`
              )
        }
      </div>
    `;
  }

  private postCard(post: Post, index: number): string {
    const expanded = this.state.commentsOpen.has(post.id);
    const media = post.media_url
      ? `<div class="post-media"><img src="${this.escapeHtml(post.media_url)}" alt="Immagine del post di @${this.escapeHtml(post.username)}" loading="lazy" decoding="async"></div>`
      : '';

    return `
      <article class="post-card" style="--i:${Math.min(index, 8)}">
        <header class="post-head">
          <button class="avatar-button" data-action="profile" data-username="${this.escapeHtml(post.username)}" aria-label="Apri il profilo di @${this.escapeHtml(post.username)}">
            ${this.avatar(post, 'md')}
          </button>
          <div class="post-by">
            <button class="post-author" data-action="profile" data-username="${this.escapeHtml(post.username)}">@${this.escapeHtml(post.username)}</button>
            <span class="post-sub">
              <span title="${this.escapeHtml(post.created_at)}">${this.timeAgo(post.created_at)}</span>
              <span class="dot-sep">·</span>
              <span class="post-visibility">${icon('globe', 12)} pubblico</span>
            </span>
          </div>
          <button class="icon-btn post-delete" data-action="delete-post" data-post="${post.id}" aria-label="Elimina post" title="Elimina post">${icon('trash', 16)}</button>
        </header>

        <div class="post-content">
          <p class="post-text">${this.renderRichText(post.content)}</p>
          ${media}
        </div>

        <footer class="post-actions">
          <button class="post-action ${post.liked ? 'is-liked' : ''}" data-action="like" data-post="${post.id}" aria-pressed="${Boolean(post.liked)}" aria-label="${post.liked ? 'Togli mi piace' : 'Metti mi piace'}">
            ${icon(post.liked ? 'heartFilled' : 'heart', 19)}
            <span>${this.formatCount(post.like_count)}</span>
          </button>
          <button class="post-action ${expanded ? 'is-active' : ''}" data-action="toggle-comments" data-post="${post.id}" aria-expanded="${expanded}" aria-label="Mostra commenti">
            ${icon('comment', 19)}
            <span>${this.formatCount(post.comment_count)}</span>
          </button>
        </footer>

        ${expanded ? this.commentsSection(post) : ''}
      </article>
    `;
  }

  private commentsSection(post: Post): string {
    return `
      <section class="comments" aria-label="Commenti al post">
        <div class="comments-list">
          <p class="comments-empty">Nessun commento. Inizia tu ✨</p>
        </div>
        <form class="comment-form" data-form="comment" data-post="${post.id}">
          ${this.avatar(this.state.currentUser!, 'xs')}
          <input
            type="text"
            name="content"
            data-draft="comment:${post.id}"
            maxlength="240"
            autocomplete="off"
            placeholder="Scrivi un commento…"
            aria-label="Scrivi un commento"
          >
          <button class="comment-send" type="submit" aria-label="Invia commento">${icon('send', 17)}</button>
        </form>
      </section>
    `;
  }

  private renderExplore(): string {
    return `
      <header class="view-head">
        <div>
          <span class="eyebrow">Scopri</span>
          <h1>Nuove <span class="grad-text">costellazioni</span></h1>
          <p>Persone, idee e post che stanno girando nel social network.</p>
        </div>
      </header>

      <div class="search-box">
        ${icon('search', 20)}
        <input
          type="text"
          data-search
          value="${this.escapeHtml(this.state.search)}"
          placeholder="Cerca persone, bio o email…"
          aria-label="Cerca persone"
          autocomplete="off"
        >
        <button class="search-clear" data-action="clear-search" aria-label="Cancella ricerca" ${this.state.search ? '' : 'hidden'}>${icon('x', 16)}</button>
      </div>

      <div id="search-results" class="stack">
        ${this.renderExploreBody()}
      </div>
    `;
  }

  private async renderExploreBody(): Promise<string> {
    const query = this.state.search.trim();

    if (query) {
      const results = await apiDatabase.searchUsers(query, this.state.currentUser!.id);
      return `
        <section class="card panel">
          <div class="section-head">
            <div>
              <span class="eyebrow">Ricerca</span>
              <h2>Risultati per "${this.escapeHtml(query)}"</h2>
            </div>
            <span class="pill">${results.length}</span>
          </div>
          ${
            results.length
              ? `<div class="user-list">${results.map((user) => this.userRow(user)).join('')}</div>`
              : this.emptyState('search', 'Nessun risultato', 'Prova con un altro username, una bio o un\'email.')
          }
        </section>
      `;
    }

    const suggestions = await apiDatabase.listSuggestedUsers(this.state.currentUser!.id, 6);
    return `
      <section class="card panel">
        <div class="section-head">
          <div>
            <span class="eyebrow">Community</span>
            <h2>Persone da scoprire</h2>
          </div>
          <span class="pill">${suggestions.length} suggeriti</span>
        </div>
        ${
          suggestions.length
            ? `<div class="user-grid">${suggestions.map((user) => this.userCard(user)).join('')}</div>`
            : this.emptyState('check', 'Segui già tutti', 'Hai già una rete completa.')
        }
      </section>
    `;
  }

  private userRow(user: User): string {
    return `
      <div class="user-row">
        <button class="user-row-main" data-action="profile" data-username="${this.escapeHtml(user.username)}">
          ${this.avatar(user, 'sm')}
          <span class="user-row-text">
            <strong>${this.escapeHtml(user.username)}</strong>
            <span>@${this.escapeHtml(user.username)}</span>
          </span>
        </button>
        <button class="btn btn-xs btn-primary follow-btn" data-action="follow" data-user="${user.id}">
          Segui
        </button>
      </div>
    `;
  }

  private userCard(user: User): string {
    return `
      <article class="user-card">
        <button class="user-card-avatar" data-action="profile" data-username="${this.escapeHtml(user.username)}" aria-label="Profilo di @${this.escapeHtml(user.username)}">
          ${this.avatar(user, 'lg')}
        </button>
        <div class="user-card-head">
          <button class="user-card-name" data-action="profile" data-username="${this.escapeHtml(user.username)}">${this.escapeHtml(user.username)}</button>
          <span class="handle">@${this.escapeHtml(user.username)}</span>
        </div>
        <p class="user-card-bio">${this.escapeHtml(user.bio || 'Nessuna bio, per ora.')}</p>
      </article>
    `;
  }

  private emptyState(iconName: string, title: string, copy: string, action = ''): string {
    return `
      <div class="empty-state">
        <span class="empty-icon">${icon(iconName, 28)}</span>
        <h3>${this.escapeHtml(title)}</h3>
        <p>${this.escapeHtml(copy)}</p>
        ${action}
      </div>
    `;
  }

  private sidebar(): string {
    const isHome = this.state.view === 'home';
    const isExplore = this.state.view === 'explore';

    return `
      <aside class="sidebar">
        <button class="brand" data-action="nav" data-view="home" aria-label="Nebula, vai alla home">
          <span class="brand-mark"><img src="./favicon.svg" alt=""></span>
          <span class="brand-word">nebula<span class="brand-dot">.</span></span>
        </button>

        <nav class="side-nav" aria-label="Navigazione principale">
          ${this.navButton('home', 'Home', 'home', isHome)}
          ${this.navButton('explore', 'Esplora', 'compass', isExplore)}
          ${this.navButton('profile', 'Profilo', 'user', this.state.view === 'profile' && this.state.profileUsername === this.state.currentUser?.username)}
        </nav>

        <button class="btn btn-primary btn-block compose-cta" data-action="focus-composer">
          ${icon('plus', 18)} Nuovo post
        </button>

        <div class="sidebar-spacer"></div>

        <button class="account-button" data-action="show-profile">
          ${this.avatar(this.state.currentUser!, 'sm')}
          <span class="account-button-text">
            <strong>${this.escapeHtml(this.state.currentUser!.username)}</strong>
            <span>@${this.escapeHtml(this.state.currentUser!.username)} · online</span>
          </span>
          ${icon('chevronDown', 16)}
        </button>

        <div class="sidebar-foot">
          <span class="net-status" data-network>
            ${icon('wifi', 14)}<span>Online</span>
          </span>
        </div>
      </aside>
    `;
  }

  private navButton(view: View, label: string, iconName: string, active: boolean): string {
    return `
      <button class="nav-item ${active ? 'is-active' : ''}" data-action="nav" data-view="${view}" ${active ? 'aria-current="page"' : ''}>
        ${icon(iconName, 21)}
        <span>${label}</span>
        ${active ? '<span class="nav-glow"></span>' : ''}
      </button>
    `;
  }

  private composer(): string {
    const draft = this.state.drafts.get('composer') ?? '';
    const nearLimit = draft.length > 250;

    return `
      <form class="composer" data-form="post">
        ${this.avatar(this.state.currentUser!, 'md')}
        <div class="composer-main">
          <textarea
            class="composer-input"
            name="content"
            data-draft="composer"
            rows="2"
            maxlength="280"
            placeholder="Cosa bolle in pentola, ${this.escapeHtml(this.state.currentUser!.username)}?"
            aria-label="Scrivi un nuovo post"
          >${this.escapeHtml(draft)}</textarea>

          <div class="composer-actions">
            <div class="composer-tools">
              <span class="char-counter ${nearLimit ? 'is-near' : ''}" data-counter>${draft.length}/280</span>
            </div>
            <button class="btn btn-primary btn-sm" type="submit" data-post-btn ${draft.trim() ? '' : 'disabled'}>
              Pubblica ${icon('sparkles', 16)}
            </button>
          </div>
        </div>
      </form>
    `;
  }

  // Helper methods
  private avatar(user: User, size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string {
    const sizeClasses = {
      xs: 'avatar-xs',
      sm: 'avatar-sm',
      md: 'avatar-md',
      lg: 'avatar-lg',
      xl: 'avatar-xl',
    };

    return `
      <div class="avatar ${sizeClasses[size]}">
        <img src="${this.escapeHtml(user.avatar_url || `https://ui-avatars.com/api/?name=${this.escapeHtml(user.username)}&background=6366f1&color=fff`)}" 
             alt="${this.escapeHtml(user.username)}" 
             class="avatar-img">
      </div>
    `;
  }

  private timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'adesso';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    
    return date.toLocaleDateString('it-IT');
  }

  private formatCount(count: number): string {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  }

  private renderRichText(text: string): string {
    return text
      .replace(/\n/g, '<br>')
      .replace(/#\w+/g, match => `<span class="hashtag">${this.escapeHtml(match)}</span>`);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private showError(message: string) {
    this.state.error = message;
    this.render();
  }
}

// Initialize the app
const app = new NebulaApp();