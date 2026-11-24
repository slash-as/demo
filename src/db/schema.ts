/**
 * Schema SQL della demo.
 *
 * Nota: `LIKE` è una parola chiave di SQLite, quindi la tabella
 * omonima va sempre racchiusa tra doppi apici ("LIKE").
 * Le date sono salvate come testo ISO 8601 (SQLite non ha un tipo datetime).
 */
export const SCHEMA_SQL = `
CREATE TABLE USER (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT NOT NULL UNIQUE,
  email      TEXT NOT NULL UNIQUE,
  bio        TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE POST (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES USER(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  media_url  TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE COMMENT (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES POST(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES USER(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE "LIKE" (
  user_id    INTEGER NOT NULL REFERENCES USER(id) ON DELETE CASCADE,
  post_id    INTEGER NOT NULL REFERENCES POST(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE FOLLOW (
  follower_id INTEGER NOT NULL REFERENCES USER(id) ON DELETE CASCADE,
  followee_id INTEGER NOT NULL REFERENCES USER(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE INDEX idx_post_user      ON POST(user_id);
CREATE INDEX idx_post_created   ON POST(created_at DESC);
CREATE INDEX idx_comment_post   ON COMMENT(post_id);
CREATE INDEX idx_like_post      ON "LIKE"(post_id);
CREATE INDEX idx_follow_followee ON FOLLOW(followee_id);
`;
