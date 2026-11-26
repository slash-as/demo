import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { ensureUser, verifyRequest, type AppUser } from './auth';
import { pool } from './db';
import { sealRevisionQuery } from './realtime';
import { getSnapshot } from './snapshot';
import { storageConfigured, uploadObject } from './storage';

interface AppEnv {
  Variables: {
    user: AppUser;
  };
}

const app = new Hono<AppEnv>();

const allowedOrigins = new Set(
  (
    process.env.NEBULA_ALLOWED_ORIGINS ??
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,https://slash-as.github.io'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(
  '*',
  cors({
    origin: (origin) => (allowedOrigins.has(origin) ? origin : undefined),
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86_400,
  }),
);

const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const identity = await verifyRequest(c.req.raw);

  if (!identity) {
    return c.json({ error: 'Autenticazione richiesta.' }, 401);
  }

  const user = await ensureUser(identity);
  c.set('user', user);
  await next();
});

function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanMediaUrl(value: unknown): string | null {
  const url = cleanText(value, 1000);
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || /^[a-z0-9._~/-]+$/i.test(url)) return url;
  return null;
}

app.get('/', (c) =>
  c.json({
    name: 'Nebula API',
    status: 'ok',
    endpoints: [
      'GET /health',
      'GET /bootstrap',
      'GET /realtime/seal',
      'POST /posts',
      'DELETE /posts/:id',
      'POST /posts/:id/like',
      'POST /posts/:id/comments',
      'POST /users/:id/follow',
      'PATCH /me',
      'POST /uploads',
    ],
  }),
);

app.get('/health', async (c) => {
  try {
    const { rows } = await pool.query<{ revision: string; users: number; posts: number }>(
      `SELECT
         (SELECT updated_at FROM nebula.revision WHERE id = 1) AS revision,
         (SELECT COUNT(*)::int FROM nebula.users) AS users,
         (SELECT COUNT(*)::int FROM nebula.posts) AS posts`,
    );

    return c.json({
      ok: true,
      service: 'nebula-api',
      database: true,
      auth: Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_JWKS_URL),
      storage: storageConfigured(),
      realtime: Boolean(process.env.NEON_REALTIME_SECRET),
      stats: rows[0],
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[nebula-api] health check fallito', error);
    return c.json({ ok: false, database: false }, 503);
  }
});

app.get('/bootstrap', requireUser, async (c) => {
  return c.json(await getSnapshot(c.get('user')));
});

app.get('/realtime/seal', requireUser, async (c) => {
  try {
    return c.json(await sealRevisionQuery());
  } catch (error) {
    console.error('[nebula-api] realtime seal fallito', error);
    return c.json({ error: 'Realtime non disponibile.' }, 503);
  }
});

app.post('/posts', requireUser, async (c) => {
  const body = await readJson<{ content?: unknown; mediaUrl?: unknown }>(c.req.raw);
  const content = cleanText(body?.content, 281);

  if (!content) return c.json({ error: 'Il post è vuoto.' }, 400);
  if (content.length > 280) return c.json({ error: 'Il post supera i 280 caratteri.' }, 400);

  const mediaUrl = cleanMediaUrl(body?.mediaUrl);
  if (body?.mediaUrl && !mediaUrl) {
    return c.json({ error: 'URL immagine non valido.' }, 400);
  }

  await pool.query(
    `INSERT INTO nebula.posts (user_id, content, media_url)
     VALUES ($1, $2, $3)`,
    [c.get('user').id, content, mediaUrl],
  );

  return c.json(await getSnapshot(c.get('user')), 201);
});

app.delete('/posts/:id', requireUser, async (c) => {
  const postId = parseId(c.req.param('id'));
  if (!postId) return c.json({ error: 'Post non valido.' }, 400);

  const { rowCount } = await pool.query(
    'DELETE FROM nebula.posts WHERE id = $1 AND user_id = $2',
    [postId, c.get('user').id],
  );

  if (!rowCount) return c.json({ error: 'Post non trovato o non tuo.' }, 404);

  return c.json(await getSnapshot(c.get('user')));
});

app.post('/posts/:id/like', requireUser, async (c) => {
  const postId = parseId(c.req.param('id'));
  if (!postId) return c.json({ error: 'Post non valido.' }, 400);

  const post = await pool.query('SELECT 1 FROM nebula.posts WHERE id = $1', [postId]);
  if (!post.rowCount) return c.json({ error: 'Post non trovato.' }, 404);

  const removed = await pool.query(
    'DELETE FROM nebula.likes WHERE user_id = $1 AND post_id = $2',
    [c.get('user').id, postId],
  );

  if (!removed.rowCount) {
    await pool.query(
      `INSERT INTO nebula.likes (user_id, post_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [c.get('user').id, postId],
    );
  }

  return c.json(await getSnapshot(c.get('user')));
});

app.post('/posts/:id/comments', requireUser, async (c) => {
  const postId = parseId(c.req.param('id'));
  if (!postId) return c.json({ error: 'Post non valido.' }, 400);

  const body = await readJson<{ content?: unknown }>(c.req.raw);
  const content = cleanText(body?.content, 241);

  if (!content) return c.json({ error: 'Il commento è vuoto.' }, 400);
  if (content.length > 240) return c.json({ error: 'Il commento supera i 240 caratteri.' }, 400);

  const post = await pool.query('SELECT 1 FROM nebula.posts WHERE id = $1', [postId]);
  if (!post.rowCount) return c.json({ error: 'Post non trovato.' }, 404);

  await pool.query(
    `INSERT INTO nebula.comments (post_id, user_id, content)
     VALUES ($1, $2, $3)`,
    [postId, c.get('user').id, content],
  );

  return c.json(await getSnapshot(c.get('user')), 201);
});

app.post('/users/:id/follow', requireUser, async (c) => {
  const targetId = parseId(c.req.param('id'));
  const me = c.get('user');

  if (!targetId) return c.json({ error: 'Utente non valido.' }, 400);
  if (targetId === me.id) return c.json({ error: 'Non puoi seguire te stesso.' }, 400);

  const target = await pool.query('SELECT 1 FROM nebula.users WHERE id = $1', [targetId]);
  if (!target.rowCount) return c.json({ error: 'Utente non trovato.' }, 404);

  const removed = await pool.query(
    'DELETE FROM nebula.follows WHERE follower_id = $1 AND followee_id = $2',
    [me.id, targetId],
  );

  if (!removed.rowCount) {
    await pool.query(
      `INSERT INTO nebula.follows (follower_id, followee_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [me.id, targetId],
    );
  }

  return c.json(await getSnapshot(me));
});

app.patch('/me', requireUser, async (c) => {
  const body = await readJson<{ bio?: unknown; avatarUrl?: unknown }>(c.req.raw);
  const bio = cleanText(body?.bio, 160);
  const avatarRaw = cleanText(body?.avatarUrl, 1000);
  const avatarUrl = avatarRaw ? cleanMediaUrl(avatarRaw) : '';

  if (avatarRaw && avatarUrl === null) {
    return c.json({ error: 'Avatar non valido.' }, 400);
  }

  const { rows } = await pool.query<AppUser>(
    `UPDATE nebula.users
        SET bio = $1, avatar_url = $2
      WHERE id = $3
      RETURNING *`,
    [bio, avatarUrl ?? '', c.get('user').id],
  );

  if (!rows[0]) return c.json({ error: 'Utente non trovato.' }, 404);

  return c.json(await getSnapshot(rows[0]));
});

const imageExtensions = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/avif', 'avif'],
]);

app.post('/uploads', requireUser, async (c) => {
  if (!storageConfigured()) {
    return c.json({ error: 'Object Storage non configurato.' }, 503);
  }

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: 'Richiesta upload non valida.' }, 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return c.json({ error: 'Nessun file caricato.' }, 400);
  }

  const extension = imageExtensions.get(file.type);
  if (!extension) {
    return c.json({ error: 'Formato non supportato. Usa PNG, JPEG, WebP, GIF o AVIF.' }, 415);
  }

  if (file.size === 0) return c.json({ error: 'Il file è vuoto.' }, 400);
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'Il file supera i 5 MB.' }, 413);
  }

  const key = `users/${c.get('user').id}/${randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const url = await uploadObject(key, bytes, file.type);

  return c.json({ url, key, size: file.size, contentType: file.type }, 201);
});

app.notFound((c) => c.json({ error: 'Endpoint non trovato.' }, 404));

app.onError((error, c) => {
  console.error('[nebula-api] errore non gestito', error);

  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }

  return c.json({ error: 'Errore interno del server.' }, 500);
});

export default app;
