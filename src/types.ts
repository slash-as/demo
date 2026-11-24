/**
 * Tipi condivisi tra database e interfaccia.
 * Le query restituiscono anche campi calcolati (count, flag 0/1)
 * che SQLite non tipizza: qui li rendiamo espliciti per il resto dell'app.
 */

export interface User {
  id: number;
  username: string;
  email: string;
  bio: string;
  avatar_url: string;
  created_at: string;
}

export interface PostView {
  id: number;
  user_id: number;
  content: string;
  media_url: string | null;
  created_at: string;
  username: string;
  avatar_url: string;
  like_count: number;
  comment_count: number;
  liked: number;
  is_following: number;
}

export interface CommentView {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string;
}

export interface ProfileView {
  user: User;
  post_count: number;
  follower_count: number;
  following_count: number;
  is_following: number;
}

export interface UserSuggestion extends User {
  follower_count: number;
  is_following: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface DbStats {
  users: number;
  posts: number;
  comments: number;
  likes: number;
  follows: number;
}

export type FeedScope = 'all' | 'following';
