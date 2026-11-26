// Wrapper per le operazioni sul database tramite API
import { repo, FeedHelper } from './repo';
import type { User, Post, Comment, UserProfile, Stats } from './repo';

export class ApiDatabase {
  private currentUser: User | null = null;
  private posts: Post[] = [];
  private users: User[] = [];
  private comments: Comment[] = [];
  private stats: Stats = { users: 0, posts: 0, comments: 0, likes: 0, follows: 0 };
  private loading = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const userJson = localStorage.getItem('nebula:user');
    if (userJson) {
      try {
        this.currentUser = JSON.parse(userJson);
      } catch (error) {
        console.error('Failed to parse user from storage:', error);
      }
    }
  }

  private async loadPosts(): Promise<void> {
    if (this.loading) return;
    
    this.loading = true;
    try {
      this.posts = await repo.getPosts();
    } catch (error) {
      console.error('Failed to load posts:', error);
      this.posts = [];
    } finally {
      this.loading = false;
    }
  }

  private async loadUsers(): Promise<void> {
    try {
      // Per ora carichiamo tutti gli utenti disponibili
      // In un'app reale, questo potrebbe essere ottimizzato
      this.users = await repo.searchUsers('');
    } catch (error) {
      console.error('Failed to load users:', error);
      this.users = [];
    }
  }

  private async loadStats(): Promise<void> {
    try {
      this.stats = await repo.getStats();
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.stats = { users: 0, posts: 0, comments: 0, likes: 0, follows: 0 };
    }
  }

  // User operations
  getUser(id: number): User | null {
    return this.users.find(user => user.id === id) || null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Post operations
  async createPost(content: string, mediaUrl?: string): Promise<boolean> {
    try {
      const newPost = await repo.createPost(content, mediaUrl);
      if (newPost) {
        this.posts.unshift(newPost);
        await this.loadStats(); // Aggiorna le statistiche
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to create post:', error);
      return false;
    }
  }

  async deletePost(postId: number): Promise<boolean> {
    try {
      const success = await repo.deletePost(postId);
      if (success) {
        this.posts = this.posts.filter(post => post.id !== postId);
        this.comments = this.comments.filter(comment => comment.post_id !== postId);
        await this.loadStats(); // Aggiorna le statistiche
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete post:', error);
      return false;
    }
  }

  async toggleLike(postId: number): Promise<boolean> {
    try {
      const success = await repo.likePost(postId);
      if (success) {
        // Aggiorna lo stato del like nel post locale
        const post = this.posts.find(p => p.id === postId);
        if (post) {
          post.liked = !post.liked;
          post.like_count += post.liked ? 1 : -1;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to toggle like:', error);
      return false;
    }
  }

  async addComment(postId: number, content: string): Promise<boolean> {
    try {
      const newComment = await repo.addComment(postId, content);
      if (newComment) {
        this.comments.push(newComment);
        // Aggiorna il conteggio dei commenti nel post
        const post = this.posts.find(p => p.id === postId);
        if (post) {
          post.comment_count += 1;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add comment:', error);
      return false;
    }
  }

  // Profile operations
  async updateProfile(bio: string, avatarUrl: string): Promise<boolean> {
    try {
      const updatedUser = await repo.updateProfile(bio, avatarUrl);
      if (updatedUser) {
        this.currentUser = updatedUser;
        localStorage.setItem('nebula:user', JSON.stringify(updatedUser));
        
        // Aggiorna l'utente nella lista degli utenti
        const userIndex = this.users.findIndex(u => u.id === updatedUser.id);
        if (userIndex !== -1) {
          this.users[userIndex] = updatedUser;
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update profile:', error);
      return false;
    }
  }

  async followUser(userId: number): Promise<boolean> {
    try {
      const success = await repo.followUser(userId);
      if (success) {
        // Aggiorna lo stato del follow nell'utente
        const user = this.users.find(u => u.id === userId);
        if (user) {
          user.is_following = !user.is_following;
          user.follower_count += user.is_following ? 1 : -1;
        }
        
        // Aggiorna il conteggio dei following per l'utente corrente
        if (this.currentUser) {
          this.currentUser.following_count += 1;
        }
        
        await this.loadStats(); // Aggiorna le statistiche
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to follow user:', error);
      return false;
    }
  }

  // Query methods
  async listFeed(userId: number, scope: 'all' | 'following'): Promise<Post[]> {
    if (this.posts.length === 0) {
      await this.loadPosts();
    }
    
    if (scope === 'all') {
      return FeedHelper.filterPostsByUser(this.posts, userId);
    } else {
      // Per ora, assumiamo che l'utente segua tutti gli altri utenti demo
      // In un'app reale, avremmo bisogno di ottenere la lista dei seguiti
      const followingIds = this.users
        .filter(user => user.id !== userId && user.is_following)
        .map(user => user.id);
      
      return FeedHelper.filterPostsFollowing(this.posts, userId, followingIds);
    }
  }

  async listPostsByUser(userId: number, currentUserId: number): Promise<Post[]> {
    if (this.posts.length === 0) {
      await this.loadPosts();
    }
    
    return FeedHelper.filterPostsByUser(this.posts, userId);
  }

  async getProfile(username: string, currentUserId: number): Promise<UserProfile | null> {
    try {
      const profile = await repo.getUserProfile(username);
      return profile;
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  }

  async listSuggestedUsers(userId: number, limit: number): Promise<User[]> {
    if (this.users.length === 0) {
      await this.loadUsers();
    }
    
    return FeedHelper.getSuggestedUsers(this.users, userId, limit);
  }

  async listComments(postId: number): Promise<Comment[]> {
    if (this.comments.length === 0) {
      // Per ora restituiamo un array vuoto
      // In un'app reale, avremmo bisogno di un endpoint per ottenere i commenti
      return [];
    }
    
    return this.comments.filter(comment => comment.post_id === postId);
  }

  async searchUsers(query: string, currentUserId: number): Promise<User[]> {
    if (this.users.length === 0) {
      await this.loadUsers();
    }
    
    return FeedHelper.searchUsers(this.users, query);
  }

  async listTrendingPosts(userId: number, limit: number): Promise<Post[]> {
    if (this.posts.length === 0) {
      await this.loadPosts();
    }
    
    return FeedHelper.getTrendingPosts(this.posts, limit);
  }

  async getTrendingTags(limit: number): Promise<{ tag: string; count: number }[]> {
    // Estrai hashtag da tutti i post
    const allText = this.posts.map(post => post.content).join(' ');
    return FeedHelper.extractHashtags(allText).slice(0, limit);
  }

  async getStats(): Promise<Stats> {
    if (this.stats.users === 0) {
      await this.loadStats();
    }
    
    return this.stats;
  }

  // Utility methods
  async refresh(): Promise<void> {
    await Promise.all([
      this.loadPosts(),
      this.loadUsers(),
      this.loadStats(),
    ]);
  }

  // Demo reset (non disponibile con API remota)
  async resetDemo(): Promise<void> {
    // Con un backend remoto, non possiamo resettare i dati demo
    // In un'app reale, potremmo avere un endpoint per questo
    console.warn('Demo reset not available with remote API');
    return Promise.resolve();
  }
}

// Esporta un'istanza singleton
export const apiDatabase = new ApiDatabase();