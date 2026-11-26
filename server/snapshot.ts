import { pool } from './db';
import { realtimeConfigured } from './realtime';
import { storageConfigured } from './storage';
import type {
  CommentView,
  DbStats,
  PostView,
  User,
} from '../src/types';

export interface FollowEdge {
  follower_id: number;
  followee_id: number;
}

export interface ServiceStatus {
  postgres: boolean;
  auth: boolean;
  storage: boolean;
  realtime: boolean;
}

export interface Snapshot {
  me: User;
  users: User[];
  posts: PostView[];
  comments: CommentView[];
  follows: FollowEdge[];
  stats: DbStats;
  revision: string;
  services: ServiceStatus;
}

/**
 * Il frontend mantiene uno snapshot completo in memoria: le funzioni di
 * lettura di `repo.ts` restano sincrone e la UI non deve gestire loading
 * state per ogni card. Le mutazioni restituiscono uno snapshot aggiornato.
 */
export async function getSnapshot(me: User): Promise<Snapshot> {
  const [usersResult, postsResult, commentsResult, followsResult, statsResult] =
    await Promise.all([
      pool.query<User>(
        `SELECT id, username,
                CASE WHEN id = $1 THEN email ELSE '' END AS email,
                bio, avatar_url, created_at
           FROM nebula.users
          ORDER BY id ASC`,
        [me.id],
      ),
      pool.query<PostView>(
        `SELECT p.id, p.user_id, p.content, p.media_url, p.created_at,
                u.username, u.avatar_url,
                (SELECT COUNT(*)::int FROM nebula.likes l WHERE l.post_id = p.id) AS like_count,
                (SELECT COUNT(*)::int FROM nebula.comments c WHERE c.post_id = p.id) AS comment_count,
                (CASE WHEN EXISTS (
                   SELECT 1 FROM nebula.likes l
                    WHERE l.post_id = p.id AND l.user_id = $1
                 ) THEN 1 ELSE 0 END)::int AS liked,
                (CASE WHEN EXISTS (
                   SELECT 1 FROM nebula.follows f
                    WHERE f.follower_id = $1 AND f.followee_id = p.user_id
                 ) THEN 1 ELSE 0 END)::int AS is_following
           FROM nebula.posts p
           JOIN nebula.users u ON u.id = p.user_id
          ORDER BY p.created_at DESC
          LIMIT 120`,
        [me.id],
      ),
      pool.query<CommentView>(
        `SELECT c.id, c.post_id, c.user_id, c.content, c.created_at,
                u.username, u.avatar_url
           FROM nebula.comments c
           JOIN nebula.users u ON u.id = c.user_id
          ORDER BY c.created_at ASC
          LIMIT 1000`,
      ),
      pool.query<FollowEdge>(
        'SELECT follower_id, followee_id FROM nebula.follows',
      ),
      pool.query<DbStats & { revision: string }>(
        `SELECT
           (SELECT COUNT(*)::int FROM nebula.users)    AS users,
           (SELECT COUNT(*)::int FROM nebula.posts)    AS posts,
           (SELECT COUNT(*)::int FROM nebula.comments) AS comments,
           (SELECT COUNT(*)::int FROM nebula.likes)    AS likes,
           (SELECT COUNT(*)::int FROM nebula.follows)  AS follows,
           (SELECT updated_at FROM nebula.revision WHERE id = 1) AS revision`,
      ),
    ]);

  const statsRow = statsResult.rows[0];

  return {
    me,
    users: usersResult.rows,
    posts: postsResult.rows,
    comments: commentsResult.rows,
    follows: followsResult.rows,
    stats: {
      users: statsRow?.users ?? 0,
      posts: statsRow?.posts ?? 0,
      comments: statsRow?.comments ?? 0,
      likes: statsRow?.likes ?? 0,
      follows: statsRow?.follows ?? 0,
    },
    revision: statsRow?.revision ?? '',
    services: {
      postgres: true,
      auth: Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_JWKS_URL),
      storage: storageConfigured(),
      realtime: realtimeConfigured(),
    },
  };
}
