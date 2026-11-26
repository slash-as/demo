# Piano di Implementazione Social Network con Neon

## Requisiti Funzionali

### 🔐 Senza Account (Visitatore)
- ✅ Vedere i post
- ✅ Leggere i commenti
- ✅ Vedere i profili degli altri utenti
- ✅ Creare un nuovo account
- ✅ Fare il login

### 👤 Con Account (Utente Autenticato)
- ✅ Pubblicare post
- ✅ Lasciare like
- ✅ Lasciare commenti
- ✅ Seguire/Unfollow altri profili

## Architettura Tecnica

### Backend
- **Database**: PostgreSQL su Neon
- **Autenticazione**: JWT tokens con Neon Auth
- **Storage**: Neon Object Storage (basato su AWS S3)
- **API**: Hono.js server

### Frontend
- **Framework**: Vite + TypeScript
- **UI**: Componenti custom
- **Autenticazione**: Gestione locale dei JWT tokens
- **PWA**: Supporto per installazione come app

## Struttura Database PostgreSQL

### Tabella `users`
```sql
CREATE TABLE nebula.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url VARCHAR(1000) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabella `posts`
```sql
CREATE TABLE nebula.posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES nebula.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 280),
    media_url VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabella `likes`
```sql
CREATE TABLE nebula.likes (
    user_id INTEGER REFERENCES nebula.users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES nebula.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);
```

### Tabella `comments`
```sql
CREATE TABLE nebula.comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES nebula.posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES nebula.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 240),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabella `follows`
```sql
CREATE TABLE nebula.follows (
    follower_id INTEGER REFERENCES nebula.users(id) ON DELETE CASCADE,
    followee_id INTEGER REFERENCES nebula.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, followee_id)
);
```

## Implementazione Passo Passo

### 1. Backend API Endpoints

#### Autenticazione
- `POST /auth/signup` - Registrazione nuovo utente
- `POST /auth/signin` - Login utente
- `GET /auth/me` - Get utente corrente

#### Post
- `GET /posts` - Lista post (pubblica)
- `POST /posts` - Crea nuovo post (autenticato)
- `DELETE /posts/:id` - Elimina post (autenticato, solo il proprietario)
- `POST /posts/:id/like` - Aggiungi/rimuovi like (autenticato)

#### Commenti
- `GET /posts/:id/comments` - Lista commenti (pubblica)
- `POST /posts/:id/comments` - Aggiungi commento (autenticato)

#### Profili
- `GET /users/:id` - Profilo utente (pubblico)
- `PATCH /users/:id` - Aggiorna profilo (autenticato, solo il proprietario)
- `POST /users/:id/follow` - Segui/Unfollow (autenticato)

#### Media
- `POST /uploads` - Upload file (autenticato)

### 2. Frontend Componenti

#### Autenticazione
- `LoginScreen` - Form login
- `RegisterScreen` - Form registrazione
- `AuthGuard` - HOC per rotte protette

#### Post
- `PostList` - Lista post
- `PostItem` - Singolo post
- `CreatePost` - Form creazione post

#### Profili
- `UserProfile` - Profilo utente
- `UserList` - Lista utenti

### 3. Gestione Sicura Password

```typescript
// Hashing con bcrypt
import bcrypt from 'bcrypt';

// Registrazione
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Login
const isValid = await bcrypt.compare(password, user.password_hash);
```

### 4. JWT Token Management

```typescript
// Salvataggio token
localStorage.setItem('nebula:token', token);

// Invio token con ogni richiesta
headers: {
  'Authorization': `Bearer ${token}`
}
```

### 5. Neon Object Storage

```typescript
// Upload file
const response = await fetch(`${API_BASE_URL}/uploads`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

// Ottenere URL del file
const { url } = await response.json();
```

## Piano di Sviluppo

### Fase 1: Backend API
1. Creazione database schema
2. Implementazione endpoint autenticazione
3. Implementazione endpoint post
4. Implementazione endpoint profili

### Fase 2: Frontend Base
1. Setup progetto Vite
2. Componenti base UI
3. Routing con autenticazione
4. Connessione API

### Fase 3: Funzionalità Complete
1. Sistema post con like/commenti
2. Sistema follow
3. Upload file
4. Ottimizzazioni performance

### Fase 4: Deployment
1. Configurazione Neon
2. Configurazione Object Storage
3. Deployment GitHub Pages
4. Monitoraggio e logging

## Sicurezza

### Password
- Hashing con bcrypt (12 rounds)
- Salting automatico
- Lunghezza minima 8 caratteri

### JWT
- Scadenza token: 24 ore
- Refresh token per sessioni lunghe
- Revoca token su logout

### Protezione API
- Rate limiting
- CORS configurato
- Input validation
- SQL injection prevention

## Performance

### Database
- Indici su colonne usate frequentemente
- Query ottimizzate
- Connection pooling

### Frontend
- Lazy loading immagini
- Caching dati
- Compressione asset

Questo piano fornisce una roadmap completa per implementare un social network sicuro e performante con Neon come backend.