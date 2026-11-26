# Sistema di Accesso Pubblico per Nebula

## Descrizione
Il progetto Nebula ora supporta un sistema di accesso pubblico che permette agli utenti non autenticati di accedere a determinate funzionalità, mentre altre sono riservate agli utenti autenticati.

## Funzionalità Disponibili

### 🆓 Senza Account (Visitatori)
- ✅ **Visualizzare i post**: Tutti gli utenti possono vedere i post pubblicati
- ✅ **Leggere i commenti**: Tutti gli utenti possono leggere i commenti sui post
- ✅ **Vedere i profili degli altri utenti**: Tutti gli utenti possono visualizzare i profili pubblici
- ✅ **Creare un nuovo account**: Gli utenti possono registrarsi
- ✅ **Fare il login**: Gli utenti possono accedere con le loro credenziali

### 🔐 Con Account (Utenti Autenticati)
- ✅ **Pubblicare post**: Solo gli utenti autenticati possono creare nuovi post
- ✅ **Lasciare like**: Solo gli utenti autenticati possono mettere/rimuovere like
- ✅ **Lasciare commenti**: Solo gli utenti autenticati possono commentare i post
- ✅ **Seguire/Unfollow**: Solo gli utenti autenticati possono seguire altri utenti

## Implementazione Tecnica

### API Client (`src/api/client.ts`)

#### Metodi per Tutti (Autenticati e Non)
- `getPublicPosts()`: Ottiene tutti i post pubblici
- `getComments(postId)`: Ottiene i commenti di un post specifico
- `getUserProfile(userId)`: Ottiene il profilo di un utente specifico
- `getAllUsers()`: Ottiene la lista di tutti gli utenti

#### Metodi per Utenti Autenticati Solo
- `createPost(content, mediaUrl)`: Crea un nuovo post
- `addComment(postId, content)`: Aggiunge un commento a un post
- `toggleFollow(userId)`: Segue/Unfollow un utente
- `updateProfile(bio, avatarUrl)`: Aggiorna il profilo utente
- `uploadFile(file)`: Carica file multimediali

#### Gestione Autenticazione
```typescript
// Il metodo getAuthToken() ora restituisce null per utenti non autenticati
private async getAuthToken(): Promise<string | null> {
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

  // Se non abbiamo un token, restituiamo null (utente non autenticato)
  return null;
}
```

#### Controllo di Autenticazione
```typescript
// Esempio di controllo in createPost()
async createPost(content: string, mediaUrl?: string | null) {
  // Check if user is authenticated
  const isDeployed = window.location.hostname === 'slash-as.github.io';
  const isAuthenticated = isDeployed ? 
    !!localStorage.getItem('nebula:me') : 
    !!(await this.getAuthToken());
  
  if (!isAuthenticated) {
    throw new Error('Authentication required to create posts');
  }
  
  // ... resto della logica
}
```

### Backend (Deployato)

Per la versione deployata su GitHub Pages:
- I dati vengono salvati in localStorage
- Le funzionalità autenticate controllano la presenza di un utente in localStorage
- I dati persistono durante la sessione ma vengono persi al refresh

## Test

### File di Test
- `test-public-access.html`: Pagina di test completa per verificare tutte le funzionalità

### Come Testare
1. Apri `test-public-access.html` nel browser
2. Testa le funzionalità disponibili per utenti non autenticati
3. Prova ad accedere con un account
4. Verifica che le funzionalità riservate funzionino dopo il login

## Flusso Utente

### Visitatore
1. Accede al sito
2. Visualizza i post pubblici
3. Legge i commenti
4. Visualizza i profili utente
5. Decide di registrarsi o fare login

### Utente Autenticato
1. Accede con le proprie credenziali
2. Visualizza i post (con funzionalità aggiuntive)
3. Può creare nuovi post
4. Può mettere like e commentare
5. Può seguire altri utenti
6. Può aggiornare il proprio profilo

## Sicurezza

### Frontend
- Controllo di autenticazione per ogni operazione sensibile
- Messaggi di errore chiari per utenti non autenticati
- Salvataggio sicuro dei token in localStorage

### Backend (Produzione)
- JWT token per autenticazione
- Rate limiting per prevenire abusi
- Validazione input per prevenire injection

## Performance

### Ottimizzazioni
- Caricamento differenziano di dati non sensibili
- Caching in localStorage per dati pubblici
- Lazy loading per contenuti pesanti

## Browser Support
- Modern browsers con supporto per fetch API
- Mobile browsers (iOS Safari, Android Chrome)
- Supporto per localStorage

## Note per il Deployment

### GitHub Pages
- Il deploy usa mock data in localStorage
- I dati non persistono tra le sessioni
- Ideale per demo e prototipi

### Produzione
- Implementare autenticazione reale con Neon
- Database PostgreSQL per persistenza dati
- Object storage per contenuti multimediali

## Prossimi Passi

1. Implementare sistema di notifiche
2. Aggiungere funzionalità di ricerca
3. Implementare sistema di hashtag
4. Aggiungere supporto per media
5. Implementare sistema di report e moderazione