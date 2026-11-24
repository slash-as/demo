import type { User } from '../types';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function displayName(username: string): string {
  return username.charAt(0).toUpperCase() + username.slice(1);
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export function avatar(
  user: Pick<User, 'username' | 'avatar_url'>,
  size: AvatarSize = 'md',
): string {
  const initial = escapeHtml(user.username.charAt(0).toUpperCase());
  const hue = hashString(user.username) % 360;
  const image = user.avatar_url
    ? `<img src="${escapeHtml(user.avatar_url)}" alt="" loading="lazy" decoding="async">`
    : '';

  return `<span class="avatar avatar-${size}" style="--avatar-hue:${hue}" aria-hidden="true"><span class="avatar-initials">${initial}</span>${image}</span>`;
}

export function formatCount(value: number): string {
  if (value < 1_000) return String(value);

  const compact = (amount: number, suffix: string): string => {
    const digits = amount < 10 ? 1 : 0;
    return `${amount.toFixed(digits).replace('.', ',').replace(',0', '')}${suffix}`;
  };

  if (value < 1_000_000) return compact(value / 1_000, 'k');
  return compact(value / 1_000_000, 'm');
}

export function timeAgo(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return '';

  const minutes = Math.floor((Date.now() - timestamp) / 60_000);

  if (minutes < 1) return 'adesso';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} g`;

  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
  }).format(timestamp);
}

export function fullDate(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return '';

  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(timestamp);
}

export function monthYear(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return '';

  return new Intl.DateTimeFormat('it-IT', {
    month: 'long',
    year: 'numeric',
  }).format(timestamp);
}

/**
 * Escape PRIMA, poi evidenzia hashtag e menzioni.
 * In questo modo il contenuto dell'utente non può iniettare HTML.
 */
export function renderRichText(text: string): string {
  return escapeHtml(text)
    .replace(/(^|\s)(#[\p{L}\p{N}_]+)/gu, '$1<span class="inline-tag">$2</span>')
    .replace(/(^|\s)(@[a-z0-9_]+)/giu, '$1<span class="inline-mention">$2</span>')
    .replace(/\n/g, '<br>');
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Buonanotte';
  if (hour < 13) return 'Buongiorno';
  if (hour < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export function normalizeImageUrl(value: string): string | null {
  const url = value.trim();
  if (!url) return null;

  if (/^(https?:\/\/|\/|\.\/|media\/|avatars\/)/i.test(url)) return url;
  return null;
}
