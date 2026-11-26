// API client per Nebula su Neon
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://br-frosty-feather-bht6iizc-api.compute.c-10.eu-central-1.aws.neon.tech';

interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  bio: string;
  avatar_url: string;
  created_at: string;
}

interface Post {
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
  is_following?: boolean;
}

interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Recupera il token dal localStorage se esiste
    const savedToken = localStorage.getItem('nebula:token');
    if (savedToken) {
      this.token = savedToken;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Aggiungi l'auth header se c'è un token
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: errorData.error || response.statusText,
        };
      }

      const data = await response.json();
      return {
        ok: true,
        data,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Autenticazione
  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.ok && response.data) {
      this.token = response.data.token;
      localStorage.setItem('nebula:token', this.token);
      localStorage.setItem('nebula:user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async register(username: string, email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });

    if (response.ok && response.data) {
      this.token = response.data.token;
      localStorage.setItem('nebula:token', this.token);
      localStorage.setItem('nebula:user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async logout(): Promise<void> {
    this.token = null;
    localStorage.removeItem('nebula:token');
    localStorage.removeItem('nebula:user');
  }

  // Ottieni l'utente corrente
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await this.request<User>('/me');
    return response;
  }

  // Post
  async getPosts(): Promise<ApiResponse<Post[]>> {
    const response = await this.request<Post[]>('/posts');
    return response;
  }

  async createPost(content: string, mediaUrl?: string): Promise<ApiResponse<Post>> {
    const response = await this.request<Post>('/posts', {
      method: 'POST',
      body: JSON.stringify({ content, media_url: mediaUrl }),
    });
    return response;
  }

  async deletePost(postId: number): Promise<ApiResponse<void>> {
    const response = await this.request<void>(`/posts/${postId}`, {
      method: 'DELETE',
    });
    return response;
  }

  async likePost(postId: number): Promise<ApiResponse<void>> {
    const response = await this.request<void>(`/posts/${postId}/like`, {
      method: 'POST',
    });
    return response;
  }

  async addComment(postId: number, content: string): Promise<ApiResponse<Comment>> {
    const response = await this.request<Comment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return response;
  }

  // Utenti
  async getUserProfile(username: string): Promise<ApiResponse<User>> {
    const response = await this.request<User>(`/users/${username}`);
    return response;
  }

  async followUser(userId: number): Promise<ApiResponse<void>> {
    const response = await this.request<void>(`/users/${userId}/follow`, {
      method: 'POST',
    });
    return response;
  }

  async searchUsers(query: string): Promise<ApiResponse<User[]>> {
    const response = await this.request<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
    return response;
  }

  // Profilo
  async updateProfile(bio: string, avatarUrl: string): Promise<ApiResponse<User>> {
    const response = await this.request<User>('/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio, avatar_url: avatarUrl }),
    });
    return response;
  }

  // Upload
  async uploadFile(file: File): Promise<ApiResponse<{ url: string; key: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/uploads`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: errorData.error || response.statusText,
        };
      }

      const data = await response.json();
      return {
        ok: true,
        data,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // Health check
  async health(): Promise<ApiResponse> {
    const response = await this.request('/health');
    return response;
  }
}

// Esporta un'istanza singleton
export const api = new ApiClient();

// Helper per ottenere l'utente corrente dal localStorage
export const getCurrentUserFromStorage = (): User | null => {
  const userJson = localStorage.getItem('nebula:user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
};

// Helper per verificare se l'utente è autenticato
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('nebula:token');
};