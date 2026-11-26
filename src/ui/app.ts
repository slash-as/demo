import { apiClient, type Snapshot, type User, type PostView, type CommentView, type UserSuggestion } from '../api/client';
import { canInstall, promptInstall } from '../pwa';
import {
  avatar,
  displayName,
  escapeHtml,
  formatCount,
  fullDate,
  greeting,
  monthYear,
  normalizeImageUrl,
  renderRichText,
  timeAgo,
} from './format';
import { icon, type IconName } from './icons';

type View = 'home' | 'explore' | 'profile';
type ToastTone = 'success' | 'info' | 'error';



interface AppState {
  view: View;
  snapshot: Snapshot;
  feedTab: 'all' | 'following';
  profileUsername: string | null;
  commentsOpen: Set<number>;
  drafts: Map<string, string>;
  mediaOpen: boolean;
  search: string;
  accountOpen: boolean;
  editProfileOpen: boolean;
  neonInfoOpen: boolean;
}

function excerpt(text: string, max = 118): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

export class App {
  private readonly root: HTMLElement;
  private readonly state: AppState;

  constructor(snapshot: Snapshot) {
    const root = document.querySelector<HTMLElement>('#app');
    if (!root) throw new Error('Elemento #app non trovato.');

    if (!snapshot.me) {
      throw new Error('Nessun utente autenticato.');
    }

    this.root = root;
    this.state = {
      view: 'home',
      snapshot,
      feedTab: 'all',
      profileUsername: null,
      commentsOpen: new Set<number>(),
      drafts: new Map<string, string>(),
      mediaOpen: false,
      search: '',
      accountOpen: false,
      editProfileOpen: false,
      neonInfoOpen: false,
    };

    this.bindEvents();
  }

  mount(): void {
    this.render();
  }

  refresh(): void {
    this.render();
  }

  notify(message: string, tone: ToastTone = 'success'): void {
    const container = document.querySelector<HTMLElement>('#toasts');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${tone}`;

    const toastIcon: IconName = tone === 'error' ? 'alert' : tone === 'info' ? 'sparkles' : 'check';
    toast.innerHTML = `${icon(toastIcon, 16)}<span></span>`;

    const label = toast.querySelector('span');
    if (label) label.textContent = message;

    container.append(toast);

    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 280);
    }, 2_800);
  }

  syncNetwork(): void {
    const online = navigator.onLine;

    this.root.querySelectorAll<HTMLElement>('[data-network]').forEach((element) => {
      element.classList.toggle('is-offline', !online);
      element.innerHTML = online
        ? `${icon('wifi', 14)}<span>Online</span>`
        : `${icon('wifiOff', 14)}<span>Offline</span>`;
    });
  }

  private bindEvents(): void {
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.root.addEventListener('submit', (event) => void this.handleSubmit(event));
    this.root.addEventListener('input', (event) => this.handleInput(event));
    this.root.addEventListener('keydown', (event) => this.handleKeydown(event));
  }

  private refreshMe(): User {
    if (!this.state.snapshot.me) {
      throw new Error('Utente corrente non trovato.');
    }
    return this.state.snapshot.me;
  }

  private render(): void {
    const me = this.refreshMe();
    this.root.innerHTML = this.layout(me);
    this.syncNetwork();
  }

  private layout(me: User): string {
    return `
      ${this.mobileTopbar(me)}
      <div class="shell">
        ${this.sidebar(me)}
        <main class="main" id="main">
          ${this.viewContent(me)}
        </main>
        ${this.rail(me)}
      </div>
      ${this.mobileNav(me)}
      ${this.state.accountOpen ? this.accountModal(me) : ''}
      ${this.state.editProfileOpen ? this.profileEditModal(me) : ''}
      ${this.state.neonInfoOpen ? this.neonInfoModal() : ''}
    `;
  }

  private viewContent(me: User): string {
    if (this.state.view === 'explore') return this.renderExplore(me);
    if (this.state.view === 'profile') {
      return this.renderProfile(this.state.profileUsername ?? me.username, me);
    }
    return this.renderHome(me);
  }

  private isOwnProfile(me: User): boolean {
    return (
      this.state.view === 'profile' &&
      (this.state.profileUsername ?? me.username).toLowerCase() === me.username.toLowerCase()
    );
  }

  private navButton(
    view: View,
    label: string,
    iconName: IconName,
    active: boolean,
  ): string {
    return `
      <button class="nav-item ${active ? 'is-active' : ''}" data-action="nav" data-view="${view}" ${active ? 'aria-current="page"' : ''}>
        ${icon(iconName, 21)}
        <span>${label}</span>
        ${active ? '<span class="nav-glow"></span>' : ''}
      </button>
    `;
  }

  private sidebar(me: User): string {
    const isHome = this.state.view === 'home';
    const isExplore = this.state.view === 'explore';
    const isProfile = this.isOwnProfile(me);

    return `
      <aside class="sidebar">
        <button class="brand" data-action="nav" data-view="home" aria-label="Nebula, vai alla home">
          <span class="brand-mark"><img src="./favicon.svg" alt=""></span>
          <span class="brand-word">nebula<span class="brand-dot">.</span></span>
        </button>

        <nav class="side-nav" aria-label="Navigazione principale">
          ${this.navButton('home', 'Home', 'home', isHome)}
          ${this.navButton('explore', 'Esplora', 'compass', isExplore)}
          ${this.navButton('profile', 'Profilo', 'user', isProfile)}
        </nav>

        <button class="btn btn-primary btn-block compose-cta" data-action="focus-composer">
          ${icon('plus', 18)} Nuovo post
        </button>

        <div class="sidebar-spacer"></div>

        ${
          canInstall()
            ? `<div class="install-card">
                <div class="install-card-glow"></div>
                <span class="install-badge">${icon('install', 15)} PWA</span>
                <strong>Porta Nebula con te</strong>
                <p>Installala come app. Funziona anche offline.</p>
                <button class="btn btn-sm btn-primary btn-block" data-action="install">Installa app</button>
              </div>`
            : ''
        }

        <button class="account-button" data-action="toggle-account" aria-haspopup="dialog">
          ${avatar(me, 'sm')}
          <span class="account-button-text">
            <strong>${escapeHtml(displayName(me.username))}</strong>
            <span>@${escapeHtml(me.username)} · demo</span>
          </span>
          ${icon('chevronDown', 16)}
        </button>

        <div class="sidebar-foot">
          <button class="side-link" data-action="refresh-data">
            ${icon('refresh', 16)}
            <span>Aggiorna dati</span>
            <span class="side-link-meta">Neon</span>
          </button>
          <button class="side-link" data-action="show-neon-info">
            ${icon('info', 16)}
            <span>Info Neon</span>
            <span class="side-link-meta">DB</span>
          </button>
          <span class="net-status" data-network></span>
        </div>
      </aside>
    `;
  }

  private mobileTopbar(me: User): string {
    return `
      <header class="mobile-topbar">
        <button class="brand brand-sm" data-action="nav" data-view="home" aria-label="Nebula, vai alla home">
          <span class="brand-mark"><img src="./favicon.svg" alt=""></span>
          <span class="brand-word">nebula<span class="brand-dot">.</span></span>
        </button>
        <div class="mobile-topbar-actions">
          <button class="icon-btn" data-action="refresh-data" aria-label="Aggiorna dati">${icon('refresh', 19)}</button>
          <button class="mobile-account" data-action="toggle-account" aria-label="Account">
            ${avatar(me, 'sm')}
          </button>
        </div>
      </header>
    `;
  }

  private mobileNav(me: User): string {
    return `
      <nav class="mobile-nav" aria-label="Navigazione mobile">
        <button class="mobile-nav-item ${this.state.view === 'home' ? 'is-active' : ''}" data-action="nav" data-view="home">
          ${icon('home', 20)}<span>Home</span>
        </button>
        <button class="mobile-nav-item ${this.state.view === 'explore' ? 'is-active' : ''}" data-action="nav" data-view="explore">
          ${icon('compass', 20)}<span>Esplora</span>
        </button>
        <button class="mobile-nav-item mobile-nav-compose" data-action="focus-composer">
          <span class="mobile-compose-orb">${icon('plus', 20)}</span><span>Post</span>
        </button>
        <button class="mobile-nav-item ${this.isOwnProfile(me) ? 'is-active' : ''}" data-action="nav" data-view="profile">
          ${icon('user', 20)}<span>Profilo</span>
        </button>
      </nav>
    `;
  }

  private renderHome(me: User): string {
    // Filtra i post in base alla tab selezionata
    let posts = this.state.snapshot.posts;
    if (this.state.feedTab === 'following') {
      const followingIds = this.state.snapshot.follows.map(f => f.followee_id);
      posts = posts.filter(post => followingIds.includes(post.user_id));
    }

    return `
      <header class="view-head">
        <div>
          <span class="eyebrow">${greeting()}, ${escapeHtml(displayName(me.username))}</span>
          <h1>La tua <span class="grad-text">orbita</span></h1>
          <p>La timeline di Nebula. I dati sono salvati su Neon.</p>
        </div>
        <div class="live-pill"><span class="live-dot"></span> ${this.state.snapshot.stats.posts} post live</div>
      </header>

      ${this.composer(me)}

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
            ? posts.map((post, index) => this.postCard(post, me, index)).join('')
            : this.emptyState(
                'users',
                'La tua rete è silenziosa',
                'Segui qualcuno o pubblica il primo post per riempire questa orbita.',
                `<button class="btn btn-primary btn-sm" data-action="nav" data-view="explore">Esplora persone</button>`,
              )
        }
      </div>
    `;
  }

  private composer(me: User): string {
    const draft = this.state.drafts.get('composer') ?? '';
    const nearLimit = draft.length > 250;

    return `
      <form class="composer" data-form="post">
        ${avatar(me, 'md')}
        <div class="composer-main">
          <textarea
            class="composer-input"
            name="content"
            data-draft="composer"
            rows="2"
            maxlength="280"
            placeholder="Cosa bolle in pentola, ${escapeHtml(displayName(me.username))}?"
            aria-label="Scrivi un nuovo post"
          >${escapeHtml(draft)}</textarea>

          <div class="composer-media ${this.state.mediaOpen ? 'is-open' : ''}">
            <span class="composer-media-icon">${icon('image', 16)}</span>
            <input
              id="media-input"
              type="file"
              name="file"
              accept="image/*,video/*"
              aria-label="Scegli immagine o video"
            >
            <div class="composer-media-tools">
              <button type="button" class="tool-btn ${this.state.mediaOpen ? 'is-active' : ''}" data-action="toggle-media" aria-label="Aggiungi media" title="Aggiungi media">
                ${icon('image', 18)}
              </button>
            </div>
          </div>

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

  private postCard(post: PostView, me: User, index: number): string {
    const expanded = this.state.commentsOpen.has(post.id);
    const mine = post.user_id === me.id;
    const canFollow = !mine && !post.is_following;
    const media = post.media_url
      ? `<div class="post-media"><img src="${escapeHtml(post.media_url)}" alt="Immagine del post di @${escapeHtml(post.username)}" loading="lazy" decoding="async"></div>`
      : '';

    return `
      <article class="post-card" style="--i:${Math.min(index, 8)}">
        <header class="post-head">
          <button class="avatar-button" data-action="profile" data-username="${escapeHtml(post.username)}" aria-label="Apri il profilo di @${escapeHtml(post.username)}">
            ${avatar(post, 'md')}
          </button>
          <div class="post-by">
            <button class="post-author" data-action="profile" data-username="${escapeHtml(post.username)}">@${escapeHtml(post.username)}</button>
            <span class="post-sub">
              <span title="${escapeHtml(fullDate(post.created_at))}">${timeAgo(post.created_at)}</span>
              <span class="dot-sep">·</span>
              <span class="post-visibility">${icon('globe', 12)} pubblico</span>
            </span>
          </div>
          ${canFollow ? `<button class="mini-follow" data-action="follow" data-user="${post.user_id}">${icon('plus', 13)} Segui</button>` : ''}
          ${mine ? `<button class="icon-btn post-delete" data-action="delete-post" data-post="${post.id}" aria-label="Elimina post" title="Elimina post">${icon('trash', 16)}</button>` : ''}
        </header>

        <div class="post-content">
          <p class="post-text">${renderRichText(post.content)}</p>
          ${media}
        </div>

        <footer class="post-actions">
          <button class="post-action ${post.liked ? 'is-liked' : ''}" data-action="like" data-post="${post.id}" aria-pressed="${Boolean(post.liked)}" aria-label="${post.liked ? 'Togli mi piace' : 'Metti mi piace'}">
            ${icon(post.liked ? 'heartFilled' : 'heart', 19)}
            <span>${formatCount(post.like_count)}</span>
          </button>
          <button class="post-action ${expanded ? 'is-active' : ''}" data-action="toggle-comments" data-post="${post.id}" aria-expanded="${expanded}" aria-label="Mostra commenti">
            ${icon('comment', 19)}
            <span>${formatCount(post.comment_count)}</span>
          </button>
          <button class="post-action post-action-share" data-action="share" data-post="${post.id}" aria-label="Condividi post">
            ${icon('share', 18)}
            <span class="action-label">Condividi</span>
          </button>
        </footer>

        ${expanded ? this.commentsSection(post, me) : ''}
      </article>
    `;
  }

  private commentsSection(post: PostView, me: User): string {
    // Filtra i commenti dallo snapshot
    const comments = this.state.snapshot.comments.filter(c => c.post_id === post.id);
    const draft = this.state.drafts.get(`comment:${post.id}`) ?? '';

    return `
      <section class="comments" aria-label="Commenti al post">
        <div class="comments-list">
          ${
            comments.length
              ? comments
                  .map(
                    (comment: CommentView) => `
                    <div class="comment">
                      <button class="comment-avatar" data-action="profile" data-username="${escapeHtml(comment.username)}" aria-label="Profilo di @${escapeHtml(comment.username)}">
                        ${avatar(comment, 'xs')}
                      </button>
                      <div class="comment-bubble">
                        <div class="comment-meta">
                          <button class="comment-author" data-action="profile" data-username="${escapeHtml(comment.username)}">@${escapeHtml(comment.username)}</button>
                          <span title="${escapeHtml(fullDate(comment.created_at))}">${timeAgo(comment.created_at)}</span>
                        </div>
                        <p>${renderRichText(comment.content)}</p>
                      </div>
                    </div>
                  `,
                  )
                  .join('')
              : `<p class="comments-empty">Nessun commento. Inizia tu ✨</p>`
          }
        </div>
        <form class="comment-form" data-form="comment" data-post="${post.id}">
          ${avatar(me, 'xs')}
          <input
            type="text"
            name="content"
            data-draft="comment:${post.id}"
            value="${escapeHtml(draft)}"
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

  private renderExplore(me: User): string {
    return `
      <header class="view-head">
        <div>
          <span class="eyebrow">Scopri</span>
          <h1>Nuove <span class="grad-text">costellazioni</span></h1>
          <p>Persone, idee e post che stanno girando nella demo.</p>
        </div>
      </header>

      <div class="search-box">
        ${icon('search', 20)}
        <input
          type="text"
          data-search
          value="${escapeHtml(this.state.search)}"
          placeholder="Cerca persone, bio o email…"
          aria-label="Cerca persone"
          autocomplete="off"
        >
        <button class="search-clear" data-action="clear-search" aria-label="Cancella ricerca" ${this.state.search ? '' : 'hidden'}>${icon('x', 16)}</button>
      </div>

      <div id="search-results" class="stack">
        ${this.exploreBody(me)}
      </div>
    `;
  }

  private exploreBody(me: User): string {
    const query = this.state.search.trim();

    if (query) {
      // Cerca utenti nello snapshot
      const results = this.state.snapshot.users.filter(user => 
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.bio.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );

      return `
        <section class="card panel">
          <div class="section-head">
            <div>
              <span class="eyebrow">Ricerca</span>
              <h2>Risultati per “${escapeHtml(query)}”</h2>
            </div>
            <span class="pill">${results.length}</span>
          </div>
          ${
            results.length
              ? `<div class="user-list">${results.map((user) => this.userRow(user, me)).join('')}</div>`
              : this.emptyState('search', 'Nessun risultato', 'Prova con un altro username, una bio o un’email.')
          }
        </section>
        ${this.trendingTagsCard()}
      `;
    }

    // Usa suggerimenti e trending dallo snapshot
    const suggestions = this.state.snapshot.users.slice(0, 6);
    const trending = this.state.snapshot.posts.slice(0, 4);

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
            ? `<div class="user-grid">${suggestions.map((user) => this.userCard(user, me)).join('')}</div>`
            : this.emptyState('check', 'Segui già tutti', 'Hai già una rete completa. Prova a cambiare account demo.')
        }
      </section>

      <section class="card panel">
        <div class="section-head">
          <div>
            <span class="eyebrow">In tendenza</span>
            <h2>Post che stanno volando</h2>
          </div>
          <span class="pill">${icon('bolt', 13)} like</span>
        </div>
        <div class="trend-list">
          ${trending.map((post, index) => this.trendingRow(post, index)).join('')}
        </div>
      </section>

      ${this.trendingTagsCard()}
    `;
  }

  private trendingRow(post: PostView, index: number): string {
    return `
      <article class="trend-row">
        <span class="trend-rank">0${index + 1}</span>
        <button class="trend-main" data-action="profile" data-username="${escapeHtml(post.username)}">
          <span class="trend-meta">@${escapeHtml(post.username)} <span class="dot-sep">·</span> ${timeAgo(post.created_at)}</span>
          <span class="trend-excerpt">${escapeHtml(excerpt(post.content))}</span>
          <span class="trend-stats">
            ${icon('heart', 13)} ${formatCount(post.like_count)}
            <span class="dot-sep">·</span>
            ${icon('comment', 13)} ${formatCount(post.comment_count)}
          </span>
        </button>
      </article>
    `;
  }

  private trendingTagsCard(): string {
    // Estrae hashtag dai post nello snapshot
    const tagCounts = new Map<string, number>();
    for (const post of this.state.snapshot.posts) {
      const matches = post.content.matchAll(/#([\p{L}\p{N}_]+)/gu);
      for (const match of matches) {
        const tag = match[1].toLowerCase();
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    const tags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 6);

    return `
      <section class="card panel">
        <div class="section-head">
          <div>
            <span class="eyebrow">Hashtag</span>
            <h2>Tendenze su Neon</h2>
          </div>
          ${icon('bolt', 18, 'head-icon')}
        </div>
        ${
          tags.length
            ? `<div class="tag-list">${tags
                .map(
                  (tag) =>
                    `<span class="tag-chip"><span class="tag-hash">#</span>${escapeHtml(tag.tag)}<small>${tag.count}</small></span>`,
                )
                .join('')}</div>`
            : `<p class="muted">Nessun hashtag, per ora.</p>`
        }
      </section>
    `;
  }

  private renderProfile(username: string, me: User): string {
    // Cerca l'utente nello snapshot
    const user = this.state.snapshot.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!user) {
      return this.emptyState(
        'users',
        'Profilo non trovato',
        `@${username} non esiste su Neon.`,
        `<button class="btn btn-primary btn-sm" data-action="nav" data-view="home">Torna alla home</button>`,
      );
    }

    // Filtra i post dell'utente
    const posts = this.state.snapshot.posts.filter(post => post.user_id === user.id);
    const isMe = user.id === me.id;
    
    // Calcola statistiche dallo snapshot
    const followerCount = this.state.snapshot.follows.filter(f => f.followee_id === user.id).length;
    const followingCount = this.state.snapshot.follows.filter(f => f.follower_id === user.id).length;
    const postCount = posts.length;
    const isFollowing = this.state.snapshot.follows.some(f => f.follower_id === me.id && f.followee_id === user.id);

    return `
      <section class="profile-hero">
        <div class="profile-cover">
          <span class="cover-glow cover-glow-a"></span>
          <span class="cover-glow cover-glow-b"></span>
          <span class="cover-grid"></span>
          <span class="cover-caption">${icon('globe', 13)} ${escapeHtml(displayName(user.username))}'s orbit</span>
        </div>
        <div class="profile-body">
          <div class="profile-top">
            <div class="profile-avatar-wrap">${avatar(user, 'xl')}</div>
            <div class="profile-actions">
              ${
                isMe
                  ? `<button class="btn btn-ghost btn-sm" data-action="edit-profile">${icon('edit', 15)} Modifica profilo</button>`
                  : this.followButton(user.id, isFollowing, false)
              }
            </div>
          </div>

          <h1>${escapeHtml(displayName(user.username))}</h1>
          <p class="handle">@${escapeHtml(user.username)}</p>
          <p class="profile-bio">${escapeHtml(user.bio || 'Nessuna bio, per ora.')}</p>

          <div class="profile-details">
            <span>${icon('calendar', 14)} Su Nebula da ${monthYear(user.created_at)}</span>
            ${
              isMe
                ? `<span>${icon('mail', 14)} ${escapeHtml(user.email)}</span>`
                : `<span>${icon('users', 14)} ${formatCount(followerCount)} follower</span>`
            }
          </div>

          <div class="profile-stats">
            <div><strong>${formatCount(postCount)}</strong><span>post</span></div>
            <div><strong>${formatCount(followerCount)}</strong><span>follower</span></div>
            <div><strong>${formatCount(followingCount)}</strong><span>seguiti</span></div>
          </div>
        </div>
      </section>

      <div class="section-title">
        <h2>${isMe ? 'I tuoi post' : `Post di @${escapeHtml(user.username)}`}</h2>
        <span class="muted">${posts.length} su Neon</span>
      </div>

      <div class="feed">
        ${
          posts.length
            ? posts.map((post, index) => this.postCard(post, me, index)).join('')
            : this.emptyState(
                'sparkles',
                'Ancora nessun post',
                isMe ? 'Pubblica qualcosa: il database è pronto.' : 'Questa persona non ha ancora pubblicato nulla.',
                isMe
                  ? `<button class="btn btn-primary btn-sm" data-action="focus-composer">Scrivi il primo post</button>`
                  : '',
              )
        }
      </div>
    `;
  }

  private rail(me: User): string {
    // Usa i dati dallo snapshot
    const suggestions = this.state.snapshot.users.slice(0, 3);
    const stats = this.state.snapshot.stats;

    return `
      <aside class="rail">
        <section class="rail-profile">
          <div class="rail-cover">
            <span class="cover-glow cover-glow-a"></span>
            <span class="cover-glow cover-glow-b"></span>
          </div>
          <div class="rail-profile-body">
            ${avatar(me, 'lg')}
            <h3>${escapeHtml(displayName(me.username))}</h3>
            <span class="handle">@${escapeHtml(me.username)}</span>
            <p>${escapeHtml(me.bio || 'Nessuna bio, per ora.')}</p>
            <div class="rail-stats">
              <div><strong>${formatCount(me.post_count ?? 0)}</strong><span>post</span></div>
              <div><strong>${formatCount(me.follower_count ?? 0)}</strong><span>follower</span></div>
              <div><strong>${formatCount(me.following_count ?? 0)}</strong><span>seguiti</span></div>
            </div>
            <button class="btn btn-ghost btn-sm btn-block" data-action="profile" data-username="${escapeHtml(me.username)}">Vedi profilo</button>
          </div>
        </section>

        <section class="card rail-card">
          <div class="section-head compact">
            <h3>Chi seguire</h3>
            ${icon('sparkles', 16, 'head-icon')}
          </div>
          ${
            suggestions.length
              ? `<div class="rail-users">${suggestions.map((user) => this.userRow(user, me)).join('')}</div>`
              : `<p class="muted small">Segui già tutti gli utenti demo.</p>`
          }
          <button class="rail-link" data-action="nav" data-view="explore">Esplora tutte le persone ${icon('arrowRight', 14)}</button>
        </section>

        <section class="card rail-card">
          <div class="section-head compact">
            <h3>Tendenze</h3>
            ${icon('bolt', 16, 'head-icon')}
          </div>
          <div class="tag-list">
            ${stats?.popular_tags?.length
              ? stats.popular_tags
                  .map(
                    (tag: any) =>
                      `<span class="tag-chip tag-chip-sm"><span class="tag-hash">#</span>${escapeHtml(tag.tag)}<small>${tag.count}</small></span>`,
                  )
                  .join('')
              : '<p class="muted small">Nessuna tendenza al momento</p>'}
          </div>
        </section>

        <section class="card db-mini">
          <div class="db-mini-head">
            <span class="db-mini-dot"></span>
            <span>Live database</span>
            <span class="pill">${stats.posts} post</span>
          </div>
          <div class="db-mini-grid">
            <div><strong>${stats.users}</strong><span>utenti</span></div>
            <div><strong>${stats.comments}</strong><span>commenti</span></div>
            <div><strong>${stats.likes}</strong><span>like</span></div>
          </div>
          <button class="db-mini-button" data-action="open-db">
            ${icon('database', 15)} Esplora SQLite ${icon('external', 13)}
          </button>
        </section>

        <footer class="rail-footer">
          <span class="brand-word">nebula<span class="brand-dot">.</span></span>
          <span>social network su Neon PostgreSQL</span>
        </footer>
      </aside>
    `;
  }

  private followButton(
    userId: number,
    isFollowing: boolean,
    isSelf: boolean,
    compact = false,
  ): string {
    if (isSelf) return `<span class="pill pill-soft">tu</span>`;

    const sizeClass = compact ? 'btn-xs' : 'btn-sm';
    const stateClass = isFollowing ? 'btn-ghost' : 'btn-primary';
    const label = isFollowing ? 'Segui già' : 'Segui';

    return `
      <button class="btn ${sizeClass} ${stateClass} follow-btn" data-action="follow" data-user="${userId}" title="${isFollowing ? 'Clicca per smettere di seguire' : 'Segui questo utente'}">
        ${isFollowing ? icon('check', 14) : icon('plus', 14)}
        <span>${label}</span>
      </button>
    `;
  }

  private userRow(user: User | UserSuggestion, me: User): string {
    return `
      <div class="user-row">
        <button class="user-row-main" data-action="profile" data-username="${escapeHtml(user.username)}">
          ${avatar(user, 'sm')}
          <span class="user-row-text">
            <strong>${escapeHtml(displayName(user.username))}</strong>
            <span>@${escapeHtml(user.username)} · ${formatCount(user.follower_count || 0)} follower</span>
          </span>
        </button>
        ${this.followButton(user.id, Boolean((user as any).is_following), user.id === me.id, true)}
      </div>
    `;
  }

  private userCard(user: User | UserSuggestion, me: User): string {
    return `
      <article class="user-card">
        <button class="user-card-avatar" data-action="profile" data-username="${escapeHtml(user.username)}" aria-label="Profilo di @${escapeHtml(user.username)}">
          ${avatar(user, 'lg')}
        </button>
        <div class="user-card-head">
          <button class="user-card-name" data-action="profile" data-username="${escapeHtml(user.username)}">${escapeHtml(displayName(user.username))}</button>
          <span class="handle">@${escapeHtml(user.username)}</span>
        </div>
        <p class="user-card-bio">${escapeHtml(user.bio || 'Nessuna bio, per ora.')}</p>
        <div class="user-card-footer">
          <span class="user-card-followers">${icon('users', 13)} ${formatCount(user.follower_count || 0)}</span>
          ${this.followButton(user.id, Boolean((user as any).is_following), user.id === me.id)}
        </div>
      </article>
    `;
  }

  private emptyState(
    iconName: IconName,
    title: string,
    copy: string,
    action = '',
  ): string {
    return `
      <div class="empty-state">
        <span class="empty-icon">${icon(iconName, 28)}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
        ${action}
      </div>
    `;
  }

  private modalShell(eyebrow: string, title: string, body: string, extraClass = ''): string {
    return `
      <div class="modal-backdrop" data-action="close-modal">
        <div class="modal ${extraClass}" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-action="noop">
          <header class="modal-head">
            <div>
              <span class="eyebrow">${escapeHtml(eyebrow)}</span>
              <h2 id="modal-title">${escapeHtml(title)}</h2>
            </div>
            <button class="icon-btn" data-action="close-modal" aria-label="Chiudi">${icon('x', 19)}</button>
          </header>
          ${body}
        </div>
      </div>
    `;
  }

  private accountModal(me: User): string {
    return this.modalShell(
      'Il tuo account',
      'Gestione profilo',
      `
        <p class="modal-copy">Sei connesso come ${escapeHtml(displayName(me.username))}. Puoi modificare il tuo profilo o uscire dall'account.</p>
        
        <div class="account-info">
          ${avatar(me, 'lg')}
          <div>
            <strong>${escapeHtml(displayName(me.username))}</strong>
            <span class="handle">@${escapeHtml(me.username)}</span>
            <p>${escapeHtml(me.bio || 'Nessuna bio, per ora.')}</p>
          </div>
        </div>

        <div class="account-actions">
          <button class="btn btn-primary btn-sm" data-action="edit-profile">${icon('edit', 15)} Modifica profilo</button>
          <button class="btn btn-danger btn-sm" id="logout-btn">${icon('logout', 15)} Esci</button>
        </div>

        <p class="modal-footnote">${icon('shield', 14)} I tuoi dati sono protetti da autenticazione JWT su Neon.</p>
      `,
      'account-modal',
    );
  }







  private profileEditModal(me: User): string {
    const bio = this.state.drafts.get('profile-bio') ?? me.bio;
    const avatarUrl = this.state.drafts.get('profile-avatar') ?? me.avatar_url;

    return this.modalShell(
      'Il tuo profilo',
      'Modifica profilo',
      `
        <form class="profile-form" data-form="profile">
          <label class="field">
            <span>Bio</span>
            <textarea name="bio" data-draft="profile-bio" rows="3" maxlength="160" placeholder="Raccontati in poche righe…">${escapeHtml(bio)}</textarea>
            <small>Massimo 160 caratteri. Finisce nella colonna <code>bio</code>.</small>
          </label>
          <label class="field">
            <span>Avatar URL</span>
            <input type="text" name="avatar" data-draft="profile-avatar" value="${escapeHtml(avatarUrl)}" placeholder="https://… oppure avatars/aurora.svg">
            <small>URL assoluto o percorso locale. Lascia vuoto per usare le iniziali.</small>
          </label>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-action="close-modal">Annulla</button>
            <button type="submit" class="btn btn-primary btn-sm">${icon('check', 15)} Salva profilo</button>
          </div>
        </form>
      `,
    );
  }

  private async handleClick(event: MouseEvent): Promise<void> {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-action]')
      : null;

    if (!target) return;

    const action = target.dataset.action;
    if (!action || action === 'noop') return;

    switch (action) {
      case 'nav': {
        const view = target.dataset.view;
        if (view === 'home' || view === 'explore' || view === 'profile') {
          this.navigate(view);
        }
        break;
      }

      case 'profile': {
        const username = target.dataset.username;
        if (username) this.navigate('profile', username);
        break;
      }

      case 'feed-tab': {
        const tab = target.dataset.tab;
        if (tab === 'all' || tab === 'following') {
          this.state.feedTab = tab;
          this.render();
        }
        break;
      }

      case 'like': {
        const postId = Number(target.dataset.post);
        if (!Number.isFinite(postId)) return;
        try {
          await apiClient.toggleLike(postId);
          // Ricarica lo snapshot per avere i dati aggiornati
          const snapshot = await apiClient.loadSnapshot();
          this.state.snapshot = snapshot;
          this.render();
        } catch (error) {
          this.notify(error instanceof Error ? error.message : 'Azione non riuscita', 'error');
        }
        break;
      }

      case 'toggle-comments': {
        const postId = Number(target.dataset.post);
        if (!Number.isFinite(postId)) return;

        if (this.state.commentsOpen.has(postId)) this.state.commentsOpen.delete(postId);
        else this.state.commentsOpen.add(postId);

        this.render();
        break;
      }

      case 'share':
        void this.sharePost(Number(target.dataset.post));
        break;

      case 'follow': {
        const userId = Number(target.dataset.user);
        if (!Number.isFinite(userId) || userId === this.refreshMe().id) return;

        try {
          const snapshot = await apiClient.toggleFollow(userId);
          this.state.snapshot = snapshot;
          this.render();

          const user = this.state.snapshot.users.find(u => u.id === userId);
          if (user) {
            const isFollowing = this.state.snapshot.follows.some(f => f.follower_id === this.refreshMe().id && f.followee_id === userId);
            this.notify(
              isFollowing ? `Ora segui @${user.username}` : `Non segui più @${user.username}`,
              isFollowing ? 'success' : 'info',
            );
          }
        } catch (error) {
          this.notify(error instanceof Error ? error.message : 'Azione non riuscita', 'error');
        }
        break;
      }

      case 'delete-post':
        this.deletePost(Number(target.dataset.post));
        break;

      case 'focus-composer':
        this.focusComposer();
        break;

      case 'toggle-media': {
        this.state.mediaOpen = !this.state.mediaOpen;
        this.render();
        if (this.state.mediaOpen) {
          this.root.querySelector<HTMLInputElement>('#media-input')?.focus();
        }
        break;
      }

      case 'upload-media': {
        const input = target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
          try {
            const url = await apiClient.uploadFile(file);
            // Aggiungi l'URL al composer
            const textarea = this.root.querySelector<HTMLTextAreaElement>('[data-draft="composer"]');
            if (textarea) {
              const currentContent = textarea.value;
              textarea.value = currentContent + `\n\n![${file.name}](${url})`;
              this.updateComposerState();
            }
            this.notify('File caricato con successo');
          } catch (error) {
            this.notify(error instanceof Error ? error.message : 'Upload fallito', 'error');
          }
        }
        break;
      }

      case 'toggle-account': {
        this.state.accountOpen = !this.state.accountOpen;
        this.state.editProfileOpen = false;
        this.state.neonInfoOpen = false;
        this.render();
        break;
      }

      case 'switch-user':
        // Con Neon Auth, non possiamo più switchare tra account demo
        this.notify('Con Neon Auth, ogni account ha le proprie credenziali', 'info');
        break;

      case 'logout':
        void this.logout();
        break;

      case 'refresh-data':
        void this.refreshData();
        break;

      case 'open-db':
        this.state.neonInfoOpen = true;
        this.state.accountOpen = false;
        this.state.editProfileOpen = false;
        this.render();
        break;

      case 'close-modal':
        this.closeModals();
        break;

      case 'show-neon-info':
        this.state.neonInfoOpen = true;
        this.state.accountOpen = false;
        this.state.editProfileOpen = false;
        this.render();
        break;

      case 'reset-db':
        this.notify('Il database è gestito da Neon, non può essere resettato localmente', 'info');
        break;

      case 'download-db':
        this.notify('Il database è su Neon, non può essere scaricato localmente', 'info');
        break;

      case 'edit-profile':
        this.state.drafts.delete('profile-bio');
        this.state.drafts.delete('profile-avatar');
        this.state.editProfileOpen = true;
        this.state.accountOpen = false;
        this.state.neonInfoOpen = false;
        this.render();
        break;

      case 'install':
        void this.installApp();
        break;

      case 'clear-search':
        this.state.search = '';
        this.render();
        this.root.querySelector<HTMLInputElement>('[data-search]')?.focus();
        break;

      default:
        break;
    }
  }

  private async handleSubmit(event: SubmitEvent): Promise<void> {
    if (!(event.target instanceof HTMLFormElement)) return;
    event.preventDefault();

    const form = event.target;
    const formType = form.dataset.form;

    if (formType === 'post') {
      await this.submitPost(form);
      return;
    }

    if (formType === 'comment') {
      this.submitComment(form);
      return;
    }

    if (formType === 'profile') {
      this.submitProfile(form);
    }
  }

  private async submitPost(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const content = String(data.get('content') ?? '');
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!content.trim()) return;

    try {
      let mediaUrl: string | null = null;
      
      // Se c'è un file, caricalo sull'object storage
      if (file) {
        mediaUrl = await apiClient.uploadFile(file);
      } else if (data.has('media')) {
        const mediaRaw = String(data.get('media') ?? '');
        if (mediaRaw.trim()) {
          mediaUrl = normalizeImageUrl(mediaRaw);
          if (!mediaUrl) {
            this.notify('URL immagine non valido. Usa https://… oppure media/mesh.svg', 'error');
            return;
          }
        }
      }

      // Crea il post tramite API
      await apiClient.createPost(content, mediaUrl);
      
      // Ricarica lo snapshot per avere i dati aggiornati
      const snapshot = await apiClient.loadSnapshot();
      this.state.snapshot = snapshot;
      
      this.state.drafts.delete('composer');
      this.state.drafts.delete('media');
      this.state.mediaOpen = false;
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.notify('Post pubblicato su Neon');
    } catch (error) {
      this.notify(error instanceof Error ? error.message : 'Pubblicazione non riuscita', 'error');
    }
  }

  private async submitComment(form: HTMLFormElement): Promise<void> {
    const postId = Number(form.dataset.post);
    const content = String(new FormData(form).get('content') ?? '');

    if (!Number.isFinite(postId) || !content.trim()) return;

    try {
      await apiClient.addComment(postId, content);
      
      // Ricarica lo snapshot per avere i dati aggiornati
      const snapshot = await apiClient.loadSnapshot();
      this.state.snapshot = snapshot;
      
      this.state.drafts.delete(`comment:${postId}`);
      this.state.commentsOpen.add(postId);
      this.render();

      const input = this.root.querySelector<HTMLInputElement>(
        `[data-draft="comment:${postId}"]`,
      );
      input?.focus();
    } catch (error) {
      this.notify(error instanceof Error ? error.message : 'Commento non riuscito', 'error');
    }
  }

  private async submitProfile(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const bio = String(data.get('bio') ?? '');
    const avatarRaw = String(data.get('avatar') ?? '');
    let avatarUrl = '';

    if (avatarRaw.trim()) {
      const normalized = normalizeImageUrl(avatarRaw);
      if (!normalized) {
        this.notify('Avatar non valido. Usa https://… oppure avatars/aurora.svg', 'error');
        return;
      }
      avatarUrl = normalized;
    }

    try {
      await apiClient.updateProfile(bio, avatarUrl);
      
      // Ricarica lo snapshot per avere i dati aggiornati
      const snapshot = await apiClient.loadSnapshot();
      this.state.snapshot = snapshot;
      
      this.state.drafts.delete('profile-bio');
      this.state.drafts.delete('profile-avatar');
      this.state.editProfileOpen = false;
      this.render();
      this.notify('Profilo aggiornato su Neon');
    } catch (error) {
      this.notify(error instanceof Error ? error.message : 'Aggiornamento profilo non riuscito', 'error');
    }
  }

  private handleInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (target.matches('[data-search]')) {
      this.state.search = target.value;
      this.updateSearchResults();
      return;
    }

    const draftKey = target.dataset.draft;
    if (!draftKey) return;

    this.state.drafts.set(draftKey, target.value);

    if (draftKey === 'composer') {
      this.updateComposerState();
    }
  }

  private updateComposerState(): void {
    const textarea = this.root.querySelector<HTMLTextAreaElement>(
      '[data-draft="composer"]',
    );
    const counter = this.root.querySelector<HTMLElement>('[data-counter]');
    const button = this.root.querySelector<HTMLButtonElement>('[data-post-btn]');

    if (!textarea) return;

    if (counter) {
      counter.textContent = `${textarea.value.length}/280`;
      counter.classList.toggle('is-near', textarea.value.length > 250);
    }

    if (button) button.disabled = textarea.value.trim().length === 0;
  }

  private updateSearchResults(): void {
    const results = this.root.querySelector<HTMLElement>('#search-results');
    if (!results) return;

    const clearButton = this.root.querySelector<HTMLElement>('[data-action="clear-search"]');
    if (clearButton) clearButton.hidden = this.state.search.length === 0;

    results.innerHTML = this.exploreBody(this.refreshMe());
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.state.accountOpen || this.state.neonInfoOpen || this.state.editProfileOpen) {
        this.closeModals();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      const target = event.target;
      if (target instanceof HTMLTextAreaElement) {
        target.closest('form')?.requestSubmit();
      }
    }
  }

  private navigate(view: View, username?: string): void {
    this.state.view = view;
    this.state.profileUsername =
      view === 'profile' ? (username ?? this.refreshMe().username) : null;
    this.state.accountOpen = false;
    this.state.editProfileOpen = false;
    this.state.neonInfoOpen = false;
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private focusComposer(): void {
    if (this.state.view !== 'home') {
      this.state.view = 'home';
      this.state.profileUsername = null;
      this.render();
    }

    window.requestAnimationFrame(() => {
      const textarea = this.root.querySelector<HTMLTextAreaElement>(
        '[data-draft="composer"]',
      );
      textarea?.focus();
      textarea?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }



  private closeModals(): void {
    this.state.accountOpen = false;
    this.state.editProfileOpen = false;
    this.state.neonInfoOpen = false;
    this.render();
  }

  private async sharePost(postId: number): Promise<void> {
    if (!Number.isFinite(postId)) return;

    const post = this.state.snapshot.posts.find(p => p.id === postId);
    if (!post) return;

    const text = `“${post.content}”\n\n— @${post.username} su Nebula`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Nebula', text });
      } else {
        await navigator.clipboard.writeText(text);
        this.notify('Post copiato negli appunti');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.notify('Condivisione non riuscita', 'error');
    }
  }

  private async deletePost(postId: number): Promise<void> {
    if (!Number.isFinite(postId)) return;

    const confirmed = window.confirm(
      'Eliminare questo post? Like e commenti collegati verranno rimossi.',
    );
    if (!confirmed) return;

    try {
      await apiClient.deletePost(postId);
      // Ricarica lo snapshot per avere i dati aggiornati
      const snapshot = await apiClient.loadSnapshot();
      this.state.snapshot = snapshot;
      this.state.commentsOpen.delete(postId);
      this.render();
      this.notify('Post eliminato da Neon', 'info');
    } catch (error) {
      this.notify(error instanceof Error ? error.message : 'Eliminazione non riuscita', 'error');
    }
  }

  private async refreshData(): Promise<void> {
    try {
      const snapshot = await apiClient.loadSnapshot();
      this.state.snapshot = snapshot;
      this.render();
      this.notify('Dati aggiornati da Neon', 'success');
    } catch (error) {
      this.notify(error instanceof Error ? error.message : 'Aggiornamento fallito', 'error');
    }
  }

  private async logout(): Promise<void> {
    try {
      await apiClient.signOut();
      localStorage.removeItem('nebula:me');
      window.location.reload();
    } catch (error) {
      console.error('Logout fallito:', error);
      localStorage.removeItem('nebula:me');
      window.location.reload();
    }
  }

  private async installApp(): Promise<void> {
    const outcome = await promptInstall();

    if (outcome === 'accepted') {
      this.notify('Nebula installata. Funziona anche offline.');
    } else if (outcome === 'dismissed') {
      this.notify('Installazione annullata', 'info');
    } else {
      this.notify('Apri il menu del browser e scegli "Installa app".', 'info');
    }

    this.render();
  }

  private neonInfoModal(): string {
    const stats = this.state.snapshot.stats;

    return this.modalShell(
      'Informazioni su Neon',
      'Database e archiviazione',
      `
        <div class="db-hero">
          <span class="db-hero-icon">${icon('database', 24)}</span>
          <div>
            <strong>PostgreSQL su Neon</strong>
            <span>Database relazionale con autenticazione</span>
          </div>
          <span class="status-pill"><span class="live-dot"></span> live</span>
        </div>

        <p class="modal-copy">Nebula utilizza Neon come backend PostgreSQL. I dati sono persistenti e sincronizzati in tempo reale. Le immagini e i video sono archiviati su Neon Object Storage.</p>

        <div class="db-stats">
          <div><strong>${stats.users}</strong><span>utenti</span></div>
          <div><strong>${stats.posts}</strong><span>post</span></div>
          <div><strong>${stats.comments}</strong><span>commenti</span></div>
          <div><strong>${stats.likes}</strong><span>like</span></div>
          <div><strong>${stats.follows}</strong><span>follow</span></div>
        </div>

        <div class="neon-features">
          <h4>Funzionalità Neon:</h4>
          <ul>
            <li>✅ Autenticazione JWT sicura</li>
            <li>✅ Database PostgreSQL relazionale</li>
            <li>✅ Archiviazione file (Object Storage)</li>
            <li>✅ Query in tempo reale</li>
            <li>✅ Backup automatici</li>
          </ul>
        </div>

        <p class="modal-footnote">${icon('wifiOff', 14)} Dopo la prima visita la PWA funziona anche offline.</p>
      `,
      'neon-modal',
    );
  }
}
