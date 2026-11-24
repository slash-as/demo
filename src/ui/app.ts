import * as database from '../db/database';
import * as repo from '../db/repo';
import { SCHEMA_SQL } from '../db/schema';
import type { FeedScope, PostView, User, UserSuggestion } from '../types';
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

const ME_STORAGE_KEY = 'nebula:me';

interface AppState {
  view: View;
  meId: number;
  feedTab: FeedScope;
  profileUsername: string | null;
  commentsOpen: Set<number>;
  drafts: Map<string, string>;
  mediaOpen: boolean;
  search: string;
  accountOpen: boolean;
  dbOpen: boolean;
  editProfileOpen: boolean;
  resetArmed: boolean;
}

function excerpt(text: string, max = 118): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

export class App {
  private readonly root: HTMLElement;
  private readonly state: AppState;
  private me: User;

  constructor(meId: number) {
    const root = document.querySelector<HTMLElement>('#app');
    if (!root) throw new Error('Elemento #app non trovato.');

    const me = repo.getUser(meId);
    if (!me) throw new Error('Utente demo non trovato.');

    this.root = root;
    this.me = me;
    this.state = {
      view: 'home',
      meId: me.id,
      feedTab: 'all',
      profileUsername: null,
      commentsOpen: new Set<number>(),
      drafts: new Map<string, string>(),
      mediaOpen: false,
      search: '',
      accountOpen: false,
      dbOpen: false,
      editProfileOpen: false,
      resetArmed: false,
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
    const me = repo.getUser(this.state.meId);
    if (!me) throw new Error('Utente corrente non trovato.');
    this.me = me;
    return me;
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
      ${this.state.dbOpen ? this.dbModal() : ''}
      ${this.state.editProfileOpen ? this.profileEditModal(me) : ''}
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
          <button class="side-link" data-action="open-db">
            ${icon('database', 16)}
            <span>Database</span>
            <span class="side-link-meta">SQL.js</span>
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
          <button class="icon-btn" data-action="open-db" aria-label="Apri il database">${icon('database', 19)}</button>
          <button class="mobile-account" data-action="toggle-account" aria-label="Cambia account demo">
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
    const posts = repo.listFeed(me.id, this.state.feedTab);
    const stats = repo.getStats();

    return `
      <header class="view-head">
        <div>
          <span class="eyebrow">${greeting()}, ${escapeHtml(displayName(me.username))}</span>
          <h1>La tua <span class="grad-text">orbita</span></h1>
          <p>La timeline della demo. Tutto vive nel tuo browser.</p>
        </div>
        <div class="live-pill"><span class="live-dot"></span> ${stats.posts} post live</div>
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
    const mediaDraft = this.state.drafts.get('media') ?? '';
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
              type="text"
              name="media"
              data-draft="media"
              inputmode="url"
              value="${escapeHtml(mediaDraft)}"
              placeholder="URL immagine oppure media/mesh.svg"
              aria-label="URL immagine del post"
            >
          </div>

          <div class="composer-actions">
            <div class="composer-tools">
              <button type="button" class="tool-btn ${this.state.mediaOpen ? 'is-active' : ''}" data-action="toggle-media" aria-label="Aggiungi immagine" title="Aggiungi immagine">
                ${icon('image', 18)}
              </button>
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
    const comments = repo.listComments(post.id);
    const draft = this.state.drafts.get(`comment:${post.id}`) ?? '';

    return `
      <section class="comments" aria-label="Commenti al post">
        <div class="comments-list">
          ${
            comments.length
              ? comments
                  .map(
                    (comment) => `
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
      const results = repo.searchUsers(query, me.id);

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

    const suggestions = repo.listSuggestedUsers(me.id, 6);
    const trending = repo.listTrendingPosts(me.id, 4);

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
    const tags = repo.getTrendingTags(6);

    return `
      <section class="card panel">
        <div class="section-head">
          <div>
            <span class="eyebrow">Hashtag</span>
            <h2>Tendenze nel database</h2>
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
    const profile = repo.getProfile(username, me.id);

    if (!profile) {
      return this.emptyState(
        'users',
        'Profilo non trovato',
        `@${username} non esiste in questo database.`,
        `<button class="btn btn-primary btn-sm" data-action="nav" data-view="home">Torna alla home</button>`,
      );
    }

    const user = profile.user;
    const posts = repo.listPostsByUser(user.id, me.id);
    const isMe = user.id === me.id;

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
                  : this.followButton(user.id, Boolean(profile.is_following), false)
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
                : `<span>${icon('users', 14)} ${formatCount(profile.follower_count)} follower</span>`
            }
          </div>

          <div class="profile-stats">
            <div><strong>${formatCount(profile.post_count)}</strong><span>post</span></div>
            <div><strong>${formatCount(profile.follower_count)}</strong><span>follower</span></div>
            <div><strong>${formatCount(profile.following_count)}</strong><span>seguiti</span></div>
          </div>
        </div>
      </section>

      <div class="section-title">
        <h2>${isMe ? 'I tuoi post' : `Post di @${escapeHtml(user.username)}`}</h2>
        <span class="muted">${posts.length} nel database</span>
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
    const profile = repo.getProfile(me.username, me.id);
    const suggestions = repo.listSuggestedUsers(me.id, 3);
    const tags = repo.getTrendingTags(5);
    const stats = repo.getStats();

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
              <div><strong>${formatCount(profile?.post_count ?? 0)}</strong><span>post</span></div>
              <div><strong>${formatCount(profile?.follower_count ?? 0)}</strong><span>follower</span></div>
              <div><strong>${formatCount(profile?.following_count ?? 0)}</strong><span>seguiti</span></div>
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
            ${tags
              .map(
                (tag) =>
                  `<span class="tag-chip tag-chip-sm"><span class="tag-hash">#</span>${escapeHtml(tag.tag)}<small>${tag.count}</small></span>`,
              )
              .join('')}
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
          <span>demo · dati locali · zero backend</span>
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

  private userRow(user: UserSuggestion, me: User): string {
    return `
      <div class="user-row">
        <button class="user-row-main" data-action="profile" data-username="${escapeHtml(user.username)}">
          ${avatar(user, 'sm')}
          <span class="user-row-text">
            <strong>${escapeHtml(displayName(user.username))}</strong>
            <span>@${escapeHtml(user.username)} · ${formatCount(user.follower_count)} follower</span>
          </span>
        </button>
        ${this.followButton(user.id, Boolean(user.is_following), user.id === me.id, true)}
      </div>
    `;
  }

  private userCard(user: UserSuggestion, me: User): string {
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
          <span class="user-card-followers">${icon('users', 13)} ${formatCount(user.follower_count)}</span>
          ${this.followButton(user.id, Boolean(user.is_following), user.id === me.id)}
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
    const users = repo.listUsers();

    return this.modalShell(
      'Modalità demo',
      'Cambia account',
      `
        <p class="modal-copy">Nebula non ha login. Scegli un utente demo e interagisci con il database come se fossi lui: like, commenti e follow cambieranno davvero le tabelle.</p>
        <div class="account-list">
          ${users
            .map(
              (user) => `
                <button class="account-row ${user.id === me.id ? 'is-active' : ''}" data-action="switch-user" data-user="${user.id}">
                  ${avatar(user, 'md')}
                  <span class="account-info">
                    <strong>${escapeHtml(displayName(user.username))} <span class="handle">@${escapeHtml(user.username)}</span></strong>
                    <span>${escapeHtml(user.bio)}</span>
                  </span>
                  ${user.id === me.id ? `<span class="pill pill-accent">${icon('check', 12)} attivo</span>` : `<span class="pill">usa</span>`}
                </button>
              `,
            )
            .join('')}
        </div>
        <p class="modal-footnote">${icon('database', 14)} Gli account sono righe della tabella <code>USER</code>.</p>
      `,
      'account-modal',
    );
  }

  private dbModal(): string {
    const stats = repo.getStats();

    return this.modalShell(
      'Dietro le quinte',
      'Il database, in chiaro',
      `
        <div class="db-hero">
          <span class="db-hero-icon">${icon('database', 24)}</span>
          <div>
            <strong>SQLite · WebAssembly</strong>
            <span>Persistito in IndexedDB</span>
          </div>
          <span class="status-pill"><span class="live-dot"></span> live</span>
        </div>

        <p class="modal-copy">SQL.js fa girare SQLite dentro la pagina. Dopo ogni scrittura esportiamo il file <code>.sqlite</code> e lo salviamo in IndexedDB: chiudi e riapri, i dati sono ancora qui.</p>

        <div class="db-stats">
          <div><strong>${stats.users}</strong><span>utenti</span></div>
          <div><strong>${stats.posts}</strong><span>post</span></div>
          <div><strong>${stats.comments}</strong><span>commenti</span></div>
          <div><strong>${stats.likes}</strong><span>like</span></div>
          <div><strong>${stats.follows}</strong><span>follow</span></div>
        </div>

        <details class="schema">
          <summary>${icon('code', 15)} Schema SQL <span class="schema-chevron">${icon('chevronDown', 15)}</span></summary>
          <pre>${escapeHtml(SCHEMA_SQL.trim())}</pre>
        </details>

        <div class="db-actions">
          <button class="btn btn-ghost btn-sm" data-action="download-db">${icon('download', 15)} Scarica .sqlite</button>
          <button class="btn btn-danger btn-sm ${this.state.resetArmed ? 'is-armed' : ''}" data-action="reset-db">
            ${icon('refresh', 15)} ${this.state.resetArmed ? 'Confermi il reset?' : 'Ripristina demo'}
          </button>
        </div>
        ${this.state.resetArmed ? `<p class="reset-hint">Clicca di nuovo per cancellare il database locale e ricaricare i dati demo.</p>` : ''}
        <p class="modal-footnote">${icon('wifiOff', 14)} Dopo la prima visita la PWA funziona anche offline.</p>
      `,
      'db-modal',
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

  private handleClick(event: MouseEvent): void {
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
        repo.toggleLike(this.me.id, postId);
        this.render();
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
        if (!Number.isFinite(userId) || userId === this.me.id) return;

        const following = repo.toggleFollow(this.me.id, userId);
        const username = repo.getUser(userId)?.username;
        this.render();

        if (username) {
          this.notify(
            following ? `Ora segui @${username}` : `Non segui più @${username}`,
            following ? 'success' : 'info',
          );
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

      case 'toggle-account': {
        this.state.accountOpen = !this.state.accountOpen;
        this.state.dbOpen = false;
        this.state.editProfileOpen = false;
        this.render();
        break;
      }

      case 'switch-user':
        this.switchUser(Number(target.dataset.user));
        break;

      case 'open-db':
        this.state.dbOpen = true;
        this.state.accountOpen = false;
        this.state.editProfileOpen = false;
        this.state.resetArmed = false;
        this.render();
        break;

      case 'close-modal':
        this.closeModals();
        break;

      case 'reset-db':
        void this.resetDemoDatabase();
        break;

      case 'download-db':
        this.downloadDatabase();
        break;

      case 'edit-profile':
        this.state.drafts.delete('profile-bio');
        this.state.drafts.delete('profile-avatar');
        this.state.editProfileOpen = true;
        this.state.accountOpen = false;
        this.state.dbOpen = false;
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
    const mediaRaw = String(data.get('media') ?? '');

    if (!content.trim()) return;

    let mediaUrl: string | null = null;
    if (mediaRaw.trim()) {
      mediaUrl = normalizeImageUrl(mediaRaw);
      if (!mediaUrl) {
        this.notify('URL immagine non valido. Usa https://… oppure media/mesh.svg', 'error');
        return;
      }
    }

    try {
      repo.createPost(this.refreshMe().id, content, mediaUrl);
      this.state.drafts.delete('composer');
      this.state.drafts.delete('media');
      this.state.mediaOpen = false;
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.notify('Post pubblicato nel database');
    } catch (error) {
      this.notify(error instanceof Error ? error.message : 'Pubblicazione non riuscita', 'error');
    }
  }

  private submitComment(form: HTMLFormElement): void {
    const postId = Number(form.dataset.post);
    const content = String(new FormData(form).get('content') ?? '');

    if (!Number.isFinite(postId) || !content.trim()) return;

    try {
      repo.addComment(postId, this.refreshMe().id, content);
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

  private submitProfile(form: HTMLFormElement): void {
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

    repo.updateProfile(this.refreshMe().id, bio, avatarUrl);
    this.state.drafts.delete('profile-bio');
    this.state.drafts.delete('profile-avatar');
    this.state.editProfileOpen = false;
    this.render();
    this.notify('Profilo aggiornato');
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
      if (this.state.accountOpen || this.state.dbOpen || this.state.editProfileOpen) {
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
    this.state.dbOpen = false;
    this.state.editProfileOpen = false;
    this.state.resetArmed = false;
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

  private switchUser(userId: number): void {
    const user = repo.getUser(userId);
    if (!user) return;

    this.state.meId = user.id;
    this.state.view = 'home';
    this.state.profileUsername = null;
    this.state.feedTab = 'all';
    this.state.commentsOpen.clear();
    this.state.drafts.clear();
    this.state.mediaOpen = false;
    this.state.search = '';
    this.state.accountOpen = false;
    this.state.dbOpen = false;
    this.state.editProfileOpen = false;
    this.state.resetArmed = false;

    localStorage.setItem(ME_STORAGE_KEY, String(user.id));
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.notify(`Ora sei @${user.username}. Prova a mettere un like.`);
  }

  private closeModals(): void {
    this.state.accountOpen = false;
    this.state.dbOpen = false;
    this.state.editProfileOpen = false;
    this.state.resetArmed = false;
    this.render();
  }

  private async sharePost(postId: number): Promise<void> {
    if (!Number.isFinite(postId)) return;

    const post = repo.getPost(postId, this.me.id);
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

  private deletePost(postId: number): void {
    if (!Number.isFinite(postId)) return;

    const confirmed = window.confirm(
      'Eliminare questo post? Like e commenti collegati verranno rimossi (ON DELETE CASCADE).',
    );
    if (!confirmed) return;

    if (repo.deletePost(postId, this.me.id)) {
      this.state.commentsOpen.delete(postId);
      this.render();
      this.notify('Post eliminato dal database', 'info');
    } else {
      this.notify('Non puoi eliminare questo post', 'error');
    }
  }

  private async resetDemoDatabase(): Promise<void> {
    if (!this.state.resetArmed) {
      this.state.resetArmed = true;
      this.render();
      return;
    }

    try {
      await database.resetDatabase();
      window.location.reload();
    } catch (error) {
      console.error(error);
      this.notify('Reset non riuscito. Riprova.', 'error');
    }
  }

  private downloadDatabase(): void {
    try {
      const bytes = database.exportBytes();
      const blob = new Blob([bytes as BlobPart], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'nebula.sqlite';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      this.notify('File SQLite scaricato');
    } catch (error) {
      console.error(error);
      this.notify('Download non riuscito', 'error');
    }
  }

  private async installApp(): Promise<void> {
    const outcome = await promptInstall();

    if (outcome === 'accepted') {
      this.notify('Nebula installata. Funziona anche offline.');
    } else if (outcome === 'dismissed') {
      this.notify('Installazione annullata', 'info');
    } else {
      this.notify('Apri il menu del browser e scegli “Installa app”.', 'info');
    }

    this.render();
  }
}
