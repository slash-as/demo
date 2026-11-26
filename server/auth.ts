import { createRemoteJWKSet, jwtVerify } from 'jose';
import { pool } from './db';

export interface AuthIdentity {
  sub: string;
  email: string;
  name?: string;
}

export interface AppUser {
  id: number;
  auth_user_id: string | null;
  username: string;
  email: string;
  bio: string;
  avatar_url: string;
  created_at: string;
}

const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;
const issuer = authBaseUrl ? new URL(authBaseUrl).origin : undefined;

/**
 * Verifica il JWT emesso da Neon Auth (Managed Better Auth).
 * Il token arriva dal browser come `Authorization: Bearer <jwt>`.
 */
export async function verifyRequest(request: Request): Promise<AuthIdentity | null> {
  if (!jwks) return null;

  const header = request.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) return null;

  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, { issuer });
    if (!payload.sub) return null;

    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : '',
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };
  } catch {
    return null;
  }
}

function sanitizeUsername(value: string): string {
  const clean = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);

  return clean || 'nebula_user';
}

async function findByAuthId(sub: string): Promise<AppUser | undefined> {
  const { rows } = await pool.query<AppUser>(
    'SELECT * FROM nebula.users WHERE auth_user_id = $1',
    [sub],
  );
  return rows[0];
}

/**
 * Collega l'utente Neon Auth a una riga di nebula.users.
 * Se esiste già un profilo demo con la stessa email, lo "adotta" invece
 * di crearne uno nuovo: i post e i follower del seed restano collegati.
 */
export async function ensureUser(identity: AuthIdentity): Promise<AppUser> {
  const existing = await findByAuthId(identity.sub);
  if (existing) return existing;

  const email = identity.email || `${identity.sub}@auth.nebula.local`;

  const linked = await pool.query<AppUser>(
    `UPDATE nebula.users
        SET auth_user_id = $1
      WHERE lower(email) = lower($2)
        AND auth_user_id IS NULL
      RETURNING *`,
    [identity.sub, email],
  );
  if (linked.rows[0]) return linked.rows[0];

  const base = sanitizeUsername(identity.name || email.split('@')[0] || 'nebula_user');

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const username = attempt === 0 ? base : `${base.slice(0, 15)}_${attempt + 1}`;

    try {
      const { rows } = await pool.query<AppUser>(
        `INSERT INTO nebula.users (auth_user_id, username, email, bio, avatar_url, created_at)
         VALUES ($1, $2, $3, '', '', now())
         RETURNING *`,
        [identity.sub, username, email],
      );
      return rows[0];
    } catch (error) {
      if ((error as { code?: string }).code !== '23505') throw error;

      // Due richieste concorrenti possono aver inserito lo stesso auth_user_id.
      const raced = await findByAuthId(identity.sub);
      if (raced) return raced;
    }
  }

  throw new Error('Impossibile creare un username univoco per questo account.');
}
