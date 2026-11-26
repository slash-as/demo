// Configurazione API
const API_BASE_URL = 'https://br-frosty-feather-bht6iizc-api.compute.c-10.eu-central-1.aws.neon.tech';

// Tipi snapshot dal backend
export interface Snapshot {
  me: User | null;
  users: User[];
  posts: PostView[];
  comments: CommentView[];
  follows: Follow[];
  stats: DbStats;
  revision: string;
  services: {
    realtime: boolean;
    storage: boolean;
  };
}

export interface UserSuggestion extends User {
  follower_count: number;
  is_following: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  bio: string;
  avatar_url: string;
  created_at: string;
  post_count?: number;
  follower_count?: number;
  following_count?: number;
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

export interface Follow {
  follower_id: number;
  followee_id: number;
  created_at: string;
}

export interface DbStats {
  users: number;
  posts: number;
  comments: number;
  likes: number;
  follows: number;
  popular_tags?: Array<{
    tag: string;
    count: number;
  }>;
}

// Client API con autenticazione JWT
export class NeonApiClient {
  private token: string | null = null;

  // Ottieni il JWT token per le richieste API
  private async getAuthToken(): Promise<string> {
    // Se abbiamo già un token, lo restituiamo
    if (this.token) {
      return this.token;
    }

    // Prova a ottenere il token dal localStorage
    const storedToken = localStorage.getItem('nebula:token');
    if (storedToken) {
      this.token = storedToken;
      return this.token;
    }

    // Se non abbiamo un token, lanciamo un errore
    throw new Error('Authentication required');
  }

  // Imposta il token JWT (dopo il login)
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('nebula:token', token);
  }

  // Rimuovi il token (dopo il logout)
  clearToken(): void {
    this.token = null;
    localStorage.removeItem('nebula:token');
  }

  // Carica lo snapshot iniziale
  async loadSnapshot(): Promise<Snapshot> {
    // For deployed version, we'll use mock data
    // In production, you would use the real backend
    if (window.location.hostname === 'slash-as.github.io') {
      const mockUser = localStorage.getItem('nebula:me');
      const user = mockUser ? JSON.parse(mockUser) : null;
      
      const mockSnapshot: Snapshot = {
        me: user,
        users: user ? [user] : [],
        posts: [],
        comments: [],
        follows: [],
        stats: {
          users: 1,
          posts: 0,
          comments: 0,
          likes: 0,
          follows: 0
        },
        revision: '1',
        services: {
          realtime: false,
          storage: false
        }
      };
      
      return mockSnapshot;
    }
    
    // For local development, use the real backend
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/bootstrap`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load snapshot: ${response.status}`);
    }

    return response.json();
  }

  // Ottieni lo stato di autenticazione corrente
  async getSession() {
    try {
      // For deployed version, check if we have a mock user
      if (window.location.hostname === 'slash-as.github.io') {
        const mockUser = localStorage.getItem('nebula:me');
        const user = mockUser ? JSON.parse(mockUser) : null;
        return { user, authenticated: !!user };
      }
      
      // For local development, use the real backend
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const user = await response.json();
        return { user, authenticated: true };
      } else {
        return { user: null, authenticated: false };
      }
    } catch {
      return { user: null, authenticated: false };
    }
  }

  // Login con email/username e password
  async signIn(identifier: string, password: string) {
    try {
      // For deployed version, we'll use a simple mock token
      // In production, you would implement proper authentication
      if (window.location.hostname === 'slash-as.github.io') {
        // Mock token for demo purposes
        const mockToken = 'mock-jwt-token-' + Math.random().toString(36).substr(2, 9);
        this.setToken(mockToken);
        
        // Create a mock user
        const mockUser = {
          id: 1,
          username: identifier.includes('@') ? identifier.split('@')[0] : identifier,
          email: identifier.includes('@') ? identifier : `${identifier}@demo.com`,
          bio: '',
          avatar_url: '',
          created_at: new Date().toISOString()
        };
        
        // Store mock user
        localStorage.setItem('nebula:me', JSON.stringify(mockUser));
        
        return { success: true, token: mockToken };
      }
      
      // For local development, try to use the backend auth endpoints
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        throw new Error('Login fallito. Verifica email e password.');
      }

      const { token } = await response.json();
      this.setToken(token);
      
      return { success: true, token };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login fallito. Verifica email e password.');
    }
  }

  // Registrazione con email, username e password
  async signUp(email: string, password: string, username: string) {
    try {
      // For deployed version, we'll use a simple mock token
      // In production, you would implement proper authentication
      if (window.location.hostname === 'slash-as.github.io') {
        // Mock token for demo purposes
        const mockToken = 'mock-jwt-token-' + Math.random().toString(36).substr(2, 9);
        this.setToken(mockToken);
        
        // Create a mock user
        const mockUser = {
          id: 1,
          username: username,
          email: email,
          bio: '',
          avatar_url: '',
          created_at: new Date().toISOString()
        };
        
        // Store mock user
        localStorage.setItem('nebula:me', JSON.stringify(mockUser));
        
        return { success: true, token: mockToken };
      }
      
      // For local development, try to use the backend auth endpoints
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username }),
      });

      if (!response.ok) {
        throw new Error('Registrazione fallita. L\'email potrebbe essere già usata.');
      }

      const { token } = await response.json();
      this.setToken(token);
      
      return { success: true, token };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Registrazione fallita.');
    }
  }

  // Logout
  async signOut() {
    this.clearToken();
    return { success: true };
  }

  // Crea un nuovo post
  async createPost(content: string, mediaUrl?: string | null) {
    // For deployed version, we'll simulate creating a post
    if (window.location.hostname === 'slash-as.github.io') {
      const mockUser = JSON.parse(localStorage.getItem('nebula:me') || '{}');
      
      if (!mockUser.id) {
        throw new Error('Authentication required');
      }
      
      const mockPost = {
        id: Date.now(),
        user_id: mockUser.id,
        content,
        media_url: mediaUrl || null,
        created_at: new Date().toISOString(),
        username: mockUser.username,
        avatar_url: mockUser.avatar_url,
        like_count: 0,
        comment_count: 0,
        liked: 0,
        is_following: 0
      };
      
      // Store the post in localStorage for demo purposes
      const posts = JSON.parse(localStorage.getItem('nebula:posts') || '[]');
      posts.unshift(mockPost);
      localStorage.setItem('nebula:posts', JSON.stringify(posts));
      
      return mockPost;
    }
    
    // For local development, use the real backend
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, media_url: mediaUrl }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create post: ${response.status}`);
    }

    return response.json();
  }

  // Elimina un post
  async deletePost(postId: number) {
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete post: ${response.status}`);
    }

    return response.json();
  }

  // Aggiungi/un like a un post
  async toggleLike(postId: number) {
    // For deployed version, we'll simulate toggling a like
    if (window.location.hostname === 'slash-as.github.io') {
      const posts = JSON.parse(localStorage.getItem('nebula:posts') || '[]');
      const post = posts.find((p: any) => p.id === postId);
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Toggle like state
      post.liked = post.liked === 1 ? 0 : 1;
      post.like_count += post.liked === 1 ? 1 : -1;
      
      localStorage.setItem('nebula:posts', JSON.stringify(posts));
      
      return post;
    }
    
    // For local development, use the real backend
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle like: ${response.status}`);
    }

    return response.json();
  }

  // Aggiungi un commento a un post
  async addComment(postId: number, content: string) {
    // For deployed version, we'll simulate adding a comment
    if (window.location.hostname === 'slash-as.github.io') {
      const mockUser = JSON.parse(localStorage.getItem('nebula:me') || '{}');
      
      if (!mockUser.id) {
        throw new Error('Authentication required');
      }
      
      const comments = JSON.parse(localStorage.getItem('nebula:comments') || '[]');
      const newComment = {
        id: Date.now(),
        post_id: postId,
        user_id: mockUser.id,
        content,
        created_at: new Date().toISOString(),
        username: mockUser.username,
        avatar_url: mockUser.avatar_url
      };
      
      comments.push(newComment);
      localStorage.setItem('nebula:comments', JSON.stringify(comments));
      
      // Update post comment count
      const posts = JSON.parse(localStorage.getItem('nebula:posts') || '[]');
      const post = posts.find((p: any) => p.id === postId);
      if (post) {
        post.comment_count = comments.filter((c: any) => c.post_id === postId).length;
        localStorage.setItem('nebula:posts', JSON.stringify(posts));
      }
      
      return newComment;
    }
    
    // For local development, use the real backend
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add comment: ${response.status}`);
    }

    return response.json();
  }

  // Segui/unfollow un utente
  async toggleFollow(userId: number) {
    // For deployed version, we'll simulate toggling a follow
    if (window.location.hostname === 'slash-as.github.io') {
      const follows = JSON.parse(localStorage.getItem('nebula:follows') || '[]');
      const existingFollow = follows.find((f: any) => f.follower_id === 1 && f.followee_id === userId);
      
      if (existingFollow) {
        // Remove follow
        const updatedFollows = follows.filter((f: any) => !(f.follower_id === 1 && f.followee_id === userId));
        localStorage.setItem('nebula:follows', JSON.stringify(updatedFollows));
        return { success: true, following: false };
      } else {
        // Add follow
        const newFollow = {
          follower_id: 1,
          followee_id: userId,
          created_at: new Date().toISOString()
        };
        follows.push(newFollow);
        localStorage.setItem('nebula:follows', JSON.stringify(follows));
        return { success: true, following: true };
      }
    }
    
    // For local development, use the real backend
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle follow: ${response.status}`);
    }

    return response.json();
  }

  // Aggiorna il profilo utente
  async updateProfile(bio: string, avatarUrl: string) {
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bio, avatar_url: avatarUrl }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update profile: ${response.status}`);
    }

    return response.json();
  }

  // Upload file per media (immagini/video)
  async uploadFile(file: File): Promise<string> {
    const token = await this.getAuthToken();
    
    // Validazione del file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    
    if (file.size > maxSize) {
      throw new Error('Il file è troppo grande. Dimensione massima: 10MB');
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo di file non supportato. Sono consentite immagini (JPEG, PNG, GIF, WebP) e video (MP4, WebM)');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/uploads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload fallito: ${response.status}`);
    }

    const result = await response.json();
    return result.url;
  }

  // Funzione helper per creare un post con file
  async createPostWithContent(content: string, file?: File): Promise<any> {
    let mediaUrl: string | null = null;
    
    if (file) {
      try {
        mediaUrl = await this.uploadFile(file);
      } catch (error) {
        throw new Error(`Upload del file fallito: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
      }
    }
    
    return await this.createPost(content, mediaUrl);
  }
}

// Esportazione istanza singleton
export const apiClient = new NeonApiClient();