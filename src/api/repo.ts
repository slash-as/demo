// Repository per accedere ai dati tramite API
import { api, isAuthenticated } from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  bio: string;
  avatar_url: string;
  created_at: string;
  is_following?: boolean;
  follower_count?: number;
  following_count?: number;
}

export interface Post {
  id: number;
  user_id: number;
  content: string;
  media_url?: string;
  created_at: string;
  username: string;
  avatar_url: string;
  like_count: number;
  comment_count: number;
  liked?: boolean;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string;
}

export interface UserProfile {
  user: User;
  post_count: number;
  follower_count: number;
  following_count: number;
  is_following?: boolean;
}

export interface Stats {
  users: number;
  posts: number;
  comments: number;
  likes: number;
  follows: number;
}

class ApiRepo {
  // Ottieni l'utente corrente
  getCurrentUser(): User | null {
    if (!isAuthenticated()) return null;
    const userJson = localStorage.getItem('nebula:user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  // Toggle like
  async toggleLike(userId: number, postId: number): Promise<boolean> {
    const response = await api.likePost(postId);
    return response.ok;
  }

  // Toggle follow
  async toggleFollow(userId: number, targetUserId: number): Promise<boolean> {
    const response = await api.followUser(targetUserId);
    return response.ok;
  }

  // Get user by ID
  getUser(id: number): User | null {
    const users = this.users.filter(user => user.id === id);
    return users.length > 0 ? users[0] : null;
  }

  // Get post by ID
  getPost(id: number, currentUserId: number): Post | null {
    const posts = this.posts.filter(post => post.id === id);
    return posts.length > 0 ? posts[0] : null;
  }

  // List all users
  listUsers(): User[] {
    return this.users;
  }

  // Post
  async getPosts(): Promise<Post[]> {
    const response = await api.getPosts();
    return response.ok && response.data ? response.data : [];
  }

  async createPost(content: string, mediaUrl?: string): Promise<Post | null> {
    const response = await api.createPost(content, mediaUrl);
    return response.ok && response.data ? response.data : null;
  }

  async deletePost(postId: number): Promise<boolean> {
    const response = await api.deletePost(postId);
    return response.ok;
  }

  async likePost(postId: number): Promise<boolean> {
    const response = await api.likePost(postId);
    return response.ok;
  }

  async addComment(postId: number, content: string): Promise<Comment | null> {
    const response = await api.addComment(postId, content);
    return response.ok && response.data ? response.data : null;
  }

  // Utenti
  async getUserProfile(username: string): Promise<UserProfile | null> {
    const response = await api.getUserProfile(username);
    return response.ok && response.data ? response.data : null;
  }

  async followUser(userId: number): Promise<boolean> {
    const response = await api.followUser(userId);
    return response.ok;
  }

  async searchUsers(query: string): Promise<User[]> {
    const response = await api.searchUsers(query);
    return response.ok && response.data ? response.data : [];
  }

  // Profilo
  async updateProfile(bio: string, avatarUrl: string): Promise<User | null> {
    const response = await api.updateProfile(bio, avatarUrl);
    return response.ok && response.data ? response.data : null;
  }

  // Upload
  async uploadFile(file: File): Promise<{ url: string; key: string } | null> {
    const response = await api.uploadFile(file);
    return response.ok && response.data ? response.data : null;
  }

  // Statistiche
  async getStats(): Promise<Stats> {
    try {
      const response = await api.health();
      if (response.ok && response.data?.stats) {
        return {
          users: response.data.stats.users || 0,
          posts: response.data.stats.posts || 0,
          comments: response.data.stats.comments || 0,
          likes: response.data.stats.likes || 0,
          follows: response.data.stats.follows || 0,
        };
      }
    } catch (error) {
      console.error('Failed to get stats:', error);
    }
    
    return {
      users: 0,
      posts: 0,
      comments: 0,
      likes: 0,
      follows: 0,
    };
  }
}

// Funzioni di utilità per il feed
export class FeedHelper {
  static filterPostsByUser(posts: Post[], userId: number): Post[] {
    return posts.filter(post => post.user_id === userId);
  }

  static filterPostsFollowing(posts: Post[], userId: number, followingIds: number[]): Post[] {
    return posts.filter(post => 
      post.user_id === userId || followingIds.includes(post.user_id)
    );
  }

  static searchPosts(posts: Post[], query: string): Post[] {
    const lowercaseQuery = query.toLowerCase();
    return posts.filter(post => 
      post.content.toLowerCase().includes(lowercaseQuery) ||
      post.username.toLowerCase().includes(lowercaseQuery)
    );
  }

  static getTrendingPosts(posts: Post[], limit: number = 4): Post[] {
    return posts
      .sort((a, b) => b.like_count - a.like_count)
      .slice(0, limit);
  }

  static getSuggestedUsers(users: User[], currentUserId: number, limit: number = 6): User[] {
    return users
      .filter(user => user.id !== currentUserId)
      .sort((a, b) => (b as any).follower_count - (a as any).follower_count)
      .slice(0, limit);
  }

  static extractHashtags(text: string): { tag: string; count: number }[] {
    const hashtags = text.match(/#\w+/g) || [];
    const tagCounts: Record<string, number> = {};
    
    hashtags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  static searchUsers(users: User[], query: string): User[] {
    const lowercaseQuery = query.toLowerCase();
    return users.filter(user => 
      user.username.toLowerCase().includes(lowercaseQuery) ||
      user.bio?.toLowerCase().includes(lowercaseQuery) ||
      user.email.toLowerCase().includes(lowercaseQuery)
    );
  }
}

export const repo = new ApiRepo();