import { all, get, run } from './database';
import type {
  CommentView,
  DbStats,
  FeedScope,
  PostView,
  ProfileView,
  TagCount,
  User,
  UserSuggestion,
} from '../types';

/**
 * Un'unica SELECT riutilizzabile per i post.
 * I due `?` iniziali sono sempre il viewer: servono per `liked` e `is_following`.
 */
const POST_SELECT = `
  SELECT
    p.id,
    p.user_id,
    p.content,
    p.media_url,
    p.created_at,
    u.username,
    u.avatar_url,
    (SELECT COUNT(*) FROM "LIKE" l WHERE l.post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM COMMENT c WHERE c.post_id = p.id) AS comment_count,
    EXISTS(
      SELECT 1 FROM "LIKE" l WHERE l.post_id = p.id AND l.user_id = ?
    ) AS liked,
    EXISTS(
      SELECT 1 FROM FOLLOW f
      WHERE f.follower_id = ? AND f.followee_id = p.user_id
    ) AS is_following
  FROM POST p
  JOIN USER u ON u.id = p.user_id
`;

const nowIso = (): string => new Date().toISOString();

export function listUsers(): User[] {
  return all<User>('SELECT * FROM USER ORDER BY id ASC;');
}

export function getUser(userId: number): User | undefined {
  return get<User>('SELECT * FROM USER WHERE id = ?;', [userId]);
}

export function getUserByUsername(username: string): User | undefined {
  return get<User>('SELECT * FROM USER WHERE username = ? COLLATE NOCASE;', [username]);
}

export function listFeed(viewerId: number, scope: FeedScope): PostView[] {
  if (scope === 'following') {
    return all<PostView>(
      `${POST_SELECT}
       WHERE p.user_id = ?
          OR EXISTS (
            SELECT 1 FROM FOLLOW f2
            WHERE f2.follower_id = ? AND f2.followee_id = p.user_id
          )
       ORDER BY p.created_at DESC
       LIMIT 60;`,
      [viewerId, viewerId, viewerId, viewerId],
    );
  }

  return all<PostView>(
    `${POST_SELECT}
     ORDER BY p.created_at DESC
     LIMIT 60;`,
    [viewerId, viewerId],
  );
}

export function listPostsByUser(userId: number, viewerId: number): PostView[] {
  return all<PostView>(
    `${POST_SELECT}
     WHERE p.user_id = ?
     ORDER BY p.created_at DESC
     LIMIT 60;`,
    [viewerId, viewerId, userId],
  );
}

export function listTrendingPosts(viewerId: number, limit = 3): PostView[] {
  return all<PostView>(
    `${POST_SELECT}
     ORDER BY like_count DESC, comment_count DESC, p.created_at DESC
     LIMIT ?;`,
    [viewerId, viewerId, limit],
  );
}

export function getPost(postId: number, viewerId: number): PostView | undefined {
  return get<PostView>(`${POST_SELECT} WHERE p.id = ?;`, [viewerId, viewerId, postId]);
}

export function createPost(userId: number, content: string, mediaUrl: string | null): number {
  const cleanContent = content.trim();

  if (!cleanContent) throw new Error('Il post è vuoto.');
  if (cleanContent.length > 280) throw new Error('Il post supera i 280 caratteri.');

  return run(
    `INSERT INTO POST (user_id, content, media_url, created_at)
     VALUES (?, ?, ?, ?);`,
    [userId, cleanContent, mediaUrl?.trim() || null, nowIso()],
  );
}

export function deletePost(postId: number, userId: number): boolean {
  const owned = get<{ id: number }>('SELECT id FROM POST WHERE id = ? AND user_id = ?;', [
    postId,
    userId,
  ]);

  if (!owned) return false;

  run('DELETE FROM POST WHERE id = ?;', [postId]);
  return true;
}

export function toggleLike(userId: number, postId: number): boolean {
  const existing = get<{ total: number }>(
    'SELECT COUNT(*) AS total FROM "LIKE" WHERE user_id = ? AND post_id = ?;',
    [userId, postId],
  );

  if (existing && existing.total > 0) {
    run('DELETE FROM "LIKE" WHERE user_id = ? AND post_id = ?;', [userId, postId]);
    return false;
  }

  run('INSERT INTO "LIKE" (user_id, post_id, created_at) VALUES (?, ?, ?);', [
    userId,
    postId,
    nowIso(),
  ]);
  return true;
}

export function listComments(postId: number): CommentView[] {
  return all<CommentView>(
    `SELECT
       c.id, c.post_id, c.user_id, c.content, c.created_at,
       u.username, u.avatar_url
     FROM COMMENT c
     JOIN USER u ON u.id = c.user_id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC;`,
    [postId],
  );
}

export function addComment(postId: number, userId: number, content: string): number {
  const cleanContent = content.trim();

  if (!cleanContent) throw new Error('Il commento è vuoto.');
  if (cleanContent.length > 240) throw new Error('Il commento supera i 240 caratteri.');

  return run(
    `INSERT INTO COMMENT (post_id, user_id, content, created_at)
     VALUES (?, ?, ?, ?);`,
    [postId, userId, cleanContent, nowIso()],
  );
}

export function getProfile(username: string, viewerId: number): ProfileView | null {
  const user = getUserByUsername(username);
  if (!user) return null;

  const counts = get<{
    post_count: number;
    follower_count: number;
    following_count: number;
    is_following: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM POST WHERE user_id = ?) AS post_count,
       (SELECT COUNT(*) FROM FOLLOW WHERE followee_id = ?) AS follower_count,
       (SELECT COUNT(*) FROM FOLLOW WHERE follower_id = ?) AS following_count,
       EXISTS(
         SELECT 1 FROM FOLLOW WHERE follower_id = ? AND followee_id = ?
       ) AS is_following;`,
    [user.id, user.id, user.id, viewerId, user.id],
  );

  return {
    user,
    post_count: counts?.post_count ?? 0,
    follower_count: counts?.follower_count ?? 0,
    following_count: counts?.following_count ?? 0,
    is_following: counts?.is_following ?? 0,
  };
}

export function toggleFollow(followerId: number, followeeId: number): boolean {
  if (followerId === followeeId) return false;

  const existing = get<{ total: number }>(
    'SELECT COUNT(*) AS total FROM FOLLOW WHERE follower_id = ? AND followee_id = ?;',
    [followerId, followeeId],
  );

  if (existing && existing.total > 0) {
    run('DELETE FROM FOLLOW WHERE follower_id = ? AND followee_id = ?;', [
      followerId,
      followeeId,
    ]);
    return false;
  }

  run('INSERT INTO FOLLOW (follower_id, followee_id, created_at) VALUES (?, ?, ?);', [
    followerId,
    followeeId,
    nowIso(),
  ]);
  return true;
}

export function listSuggestedUsers(viewerId: number, limit = 3): UserSuggestion[] {
  return all<UserSuggestion>(
    `SELECT
       u.*,
       (SELECT COUNT(*) FROM FOLLOW f WHERE f.followee_id = u.id) AS follower_count,
       0 AS is_following
     FROM USER u
     WHERE u.id <> ?
       AND NOT EXISTS (
         SELECT 1 FROM FOLLOW f
         WHERE f.follower_id = ? AND f.followee_id = u.id
       )
     ORDER BY follower_count DESC, u.username ASC
     LIMIT ?;`,
    [viewerId, viewerId, limit],
  );
}

export function searchUsers(query: string, viewerId: number, limit = 8): UserSuggestion[] {
  const like = `%${query.trim()}%`;

  return all<UserSuggestion>(
    `SELECT
       u.*,
       (SELECT COUNT(*) FROM FOLLOW f WHERE f.followee_id = u.id) AS follower_count,
       EXISTS(
         SELECT 1 FROM FOLLOW f
         WHERE f.follower_id = ? AND f.followee_id = u.id
       ) AS is_following
     FROM USER u
     WHERE u.username LIKE ?
        OR u.bio LIKE ?
        OR u.email LIKE ?
     ORDER BY is_following DESC, follower_count DESC, u.username ASC
     LIMIT ?;`,
    [viewerId, like, like, like, limit],
  );
}

export function updateProfile(userId: number, bio: string, avatarUrl: string): void {
  run('UPDATE USER SET bio = ?, avatar_url = ? WHERE id = ?;', [
    bio.trim().slice(0, 160),
    avatarUrl.trim(),
    userId,
  ]);
}

export function getStats(): DbStats {
  const stats = get<DbStats>(
    `SELECT
       (SELECT COUNT(*) FROM USER) AS users,
       (SELECT COUNT(*) FROM POST) AS posts,
       (SELECT COUNT(*) FROM COMMENT) AS comments,
       (SELECT COUNT(*) FROM "LIKE") AS likes,
       (SELECT COUNT(*) FROM FOLLOW) AS follows;`,
  );

  return stats ?? { users: 0, posts: 0, comments: 0, likes: 0, follows: 0 };
}

export function getTrendingTags(limit = 5): TagCount[] {
  const rows = all<{ content: string }>('SELECT content FROM POST;');
  const counts = new Map<string, TagCount>();

  for (const row of rows) {
    for (const match of row.content.matchAll(/#([\p{L}\p{N}_]+)/gu)) {
      const tag = match[1];
      const key = tag.toLowerCase();
      const current = counts.get(key);

      if (current) current.count += 1;
      else counts.set(key, { tag, count: 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}
