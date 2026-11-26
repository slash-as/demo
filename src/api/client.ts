import { createAuthClient } from '@neon/auth';

// Configurazione API
const API_BASE_URL = 'https://br-frosty-feather-bht6iizc-api.compute.c-10.eu-central-1.aws.neon.tech';
const AUTH_BASE_URL = 'https://ep-sweet-pond-bh26q3q1.neonauth.c-10.eu-central-1.aws.neon.tech/neondb/auth';

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

// Client API con autenticazione Neon
export class NeonApiClient {
  private auth: any;

  constructor() {
    this.auth = createAuthClient(AUTH_BASE_URL);
  }

  // Ottieni il JWT token per le richieste API
  private async getAuthToken(): Promise<string> {
    const token = await this.auth.getJWTToken(true);
    if (!token) {
      throw new Error('Authentication required');
    }
    return token;
  }

  // Carica lo snapshot iniziale
  async loadSnapshot(): Promise<Snapshot> {
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
    return await this.auth.getSession();
  }

  // Login con email/username e password
  async signIn(identifier: string, password: string) {
    // Prima prova con email, se fallisce prova con username
    try {
      return await this.auth.signIn.email({
        email: identifier,
        password,
      });
    } catch {
      // Se il login con email fallisce, potremmo dover gestire il login con username
      // Neon Auth supportata attualmente solo login con email
      throw new Error('Login fallito. Verifica email e password.');
    }
  }

  // Registrazione con email, username e password
  async signUp(email: string, password: string, username: string) {
    return await this.auth.signUp.email({
      email,
      password,
      name: username,
    });
  }

  // Logout
  async signOut() {
    return await this.auth.signOut();
  }

  // Crea un nuovo post
  async createPost(content: string, mediaUrl?: string | null) {
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