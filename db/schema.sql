-- Schema Postgres di Nebula.
-- Tutte le tabelle vivono nello schema "nebula" per non collidere con
-- quelle gestite da Neon Auth (schema neon_auth) e con le tabelle di sistema.

CREATE SCHEMA IF NOT EXISTS nebula;

CREATE TABLE IF NOT EXISTS nebula.users (
  id           BIGSERIAL PRIMARY KEY,
  auth_user_id TEXT UNIQUE,
  username     TEXT NOT NULL UNIQUE,
  email        TEXT NOT NULL UNIQUE,
  bio          TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nebula.posts (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES nebula.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  media_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nebula.comments (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES nebula.posts(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES nebula.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nebula.likes (
  user_id    BIGINT NOT NULL REFERENCES nebula.users(id) ON DELETE CASCADE,
  post_id    BIGINT NOT NULL REFERENCES nebula.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS nebula.follows (
  follower_id BIGINT NOT NULL REFERENCES nebula.users(id) ON DELETE CASCADE,
  followee_id BIGINT NOT NULL REFERENCES nebula.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

-- Una singola riga "versione" aggiornata da trigger su ogni scrittura.
-- Realtime si sottoscrive a questa riga: qualsiasi modifica al database
-- produce un evento live, e il client ricarica lo snapshot.
CREATE TABLE IF NOT EXISTS nebula.revision (
  id         SMALLINT PRIMARY KEY CHECK (id = 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO nebula.revision (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION nebula.bump_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE nebula.revision SET updated_at = clock_timestamp() WHERE id = 1;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS users_revision ON nebula.users;
CREATE TRIGGER users_revision
  AFTER INSERT OR UPDATE OR DELETE ON nebula.users
  FOR EACH STATEMENT EXECUTE FUNCTION nebula.bump_revision();

DROP TRIGGER IF EXISTS posts_revision ON nebula.posts;
CREATE TRIGGER posts_revision
  AFTER INSERT OR UPDATE OR DELETE ON nebula.posts
  FOR EACH STATEMENT EXECUTE FUNCTION nebula.bump_revision();

DROP TRIGGER IF EXISTS comments_revision ON nebula.comments;
CREATE TRIGGER comments_revision
  AFTER INSERT OR UPDATE OR DELETE ON nebula.comments
  FOR EACH STATEMENT EXECUTE FUNCTION nebula.bump_revision();

DROP TRIGGER IF EXISTS likes_revision ON nebula.likes;
CREATE TRIGGER likes_revision
  AFTER INSERT OR UPDATE OR DELETE ON nebula.likes
  FOR EACH STATEMENT EXECUTE FUNCTION nebula.bump_revision();

DROP TRIGGER IF EXISTS follows_revision ON nebula.follows;
CREATE TRIGGER follows_revision
  AFTER INSERT OR UPDATE OR DELETE ON nebula.follows
  FOR EACH STATEMENT EXECUTE FUNCTION nebula.bump_revision();

CREATE INDEX IF NOT EXISTS idx_posts_user     ON nebula.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created  ON nebula.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post  ON nebula.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post     ON nebula.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON nebula.follows(followee_id);
