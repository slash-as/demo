# Nebula

**Un social network demo con backend e database su Neon.**  
Una PWA completa con autenticazione, API RESTful, database PostgreSQL in tempo reale e storage per media, tutto su Neon Lakebase Postgres.

![Anteprima di Nebula](docs/preview.png)

![Anteprima di Nebula](docs/preview.png)

## Funzionalità

- Feed con post testuali e immagini, like, commenti e follow persistenti.
- Composer con anteprima media e supporto a upload di file.
- Esplora: ricerca di persone per username, bio o email, suggerimenti e trend.
- Profili con bio, statistiche, post e lista follower/following.
- Autenticazione con Neon Auth (Better Auth) - login, registrazione e sessioni.
- API RESTful per tutte le operazioni sul database.
- Query live in tempo reale con Neon Realtime.
- Storage per media e avatar su Neon Object Storage.
- PWA installabile, con funzionamento offline dopo la prima visita.
- UI responsive, tema dark glass, font self-hosted.

## Stack

| Livello | Scelta |
| --- | --- |
| Build | Vite 7 + TypeScript 5 |
| Database | PostgreSQL su Neon Lakebase |
| Backend | Neon Functions (Hono API) |
| Autenticazione | Neon Auth (Better Auth) |
| Storage | Neon Object Storage |
| Realtime | Neon Realtime per query live |
| PWA | `vite-plugin-pwa` + Workbox |
| UI | HTML/CSS/TypeScript a mano, nessun framework |
| Font | Manrope e Space Grotesk via `@fontsource-variable` |
| Deploy | Neon Functions + GitHub Pages |

## Architettura

```
┌─────────────────────────── browser ────────────────────────────┐
│                                                                 │
│  UI (TypeScript)                                                │
│      │ query / HTTP requests                                   │
│      ▼                                                           │
│  Neon API (Hono su Functions)                                   │
│      │ REST calls / JWT verification                            │
│      ▼                                                           │
│  Neon Lakebase Postgres                                        │
│      │ SQL queries / transactions                              │
│      ▼                                                           │
│  Neon Realtime ── Query live e reattività                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

L'applicazione è un client PWA che comunica con un backend su Neon:

- **Client**: UI in TypeScript che effettua chiamate REST all'API
- **API**: Funzione Neon con Hono framework che gestisce autenticazione, validazione e operazioni sul database
- **Database**: PostgreSQL su Neon con schema social completo (utenti, post, commenti, like, follow)
- **Realtime**: Query live che permettono aggiornamenti in tempo reale
- **Storage**: Object Storage per media e avatar

### Flusso di autenticazione

1. Utente effettua login/signup tramite Neon Auth
2. JWT viene inviato in ogni richiesta API
3. L'API verifica il JWT e recupera l'utente dal database
4. Le operazioni vengono eseguite nel contesto dell'utente autenticato

### Flusso di dati

1. UI richiede dati iniziali via `/bootstrap`
2. API esegue query e restituisce snapshot completo
3. UI mostra i dati e gestisce le interazioni
4. Le modifiche vengono inviate via POST/DELETE/PATCH
5. API valida e scrive nel database
6. Realtime notifica i cambiamenti ai client connessi

## Schema del database

Il database PostgreSQL su Neon utilizza lo schema "nebula" per evitare conflitti con le tabelle di sistema di Neon Auth.

```sql
CREATE SCHEMA IF NOT EXISTS nebula;

CREATE TABLE nebula.users (
  id           BIGSERIAL PRIMARY KEY,
  auth_user_id TEXT UNIQUE,
  username     TEXT NOT NULL UNIQUE,
  email        TEXT NOT NULL UNIQUE,
  bio          TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE nebula.posts (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES nebula.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  media_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE nebula.comments (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES nebula.posts(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES nebula.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE nebula.likes (
  user_id    BIGINT NOT NULL REFERENCES nebula.users(id) ON DELETE CASCADE,
  post_id    BIGINT NOT NULL REFERENCES nebula.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE nebula.follows (
  follower_id BIGINT NOT NULL REFERENCES nebula.users(id) ON DELETE CASCADE,
  followee_id BIGINT NOT NULL REFERENCES nebula.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

-- Tabella di revisione per Realtime
CREATE TABLE nebula.revision (
  id         SMALLINT PRIMARY KEY CHECK (id = 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Caratteristiche:

- **Chiavi primarie auto-incrementanti** con `BIGSERIAL` per supportare grandi quantità di dati
- **Relazioni con CASCADE** per eliminazione automatica dei dati correlati
- **Chiavi primarie composte** per like e follow per evitare duplicati
- **Timestamp** con timezone per tutte le date
- **Schema dedicato** `nebula` per evitare conflitti
- **Trigger di revisione** che aggiornano una tabella speciale per supportare Realtime
- **Indici** sulle colonne più usate per performance ottimali

### API Endpoints

L'API su Neon Functions espone i seguenti endpoint:

- `GET /health` - Stato del servizio
- `GET /bootstrap` - Dati iniziali per utenti autenticati
- `GET /realtime/seal` - Query realtime
- `POST /posts` - Creare un post
- `DELETE /posts/:id` - Eliminare un post
- `POST /posts/:id/like` - Mettere like a un post
- `POST /posts/:id/comments` - Commentare un post
- `POST /users/:id/follow` - Seguire un utente
- `PATCH /me` - Aggiornare il profilo
- `POST /uploads` - Caricare file su Object Storage

## Account demo

L'applicazione supporta autenticazione completa tramite Neon Auth. Al primo avvio, gli utenti possono registrarsi o accedere con le credenziali demo:

| Username | Email |
| --- | --- |
| `aurora` | `aurora@nebula.demo` |
| `leo` | `leo@nebula.demo` |
| `mia` | `mia@nebula.demo` |
| `noah` | `noah@nebula.demo` |
| `sofia` | `sofia@nebula.demo` |
| `kai` | `kai@nebula.demo` |
| `emma` | `emma@nebula.demo` |
| `davide` | `davide@nebula.demo` |

**Nota**: Per usare gli account demo, è necessario impostare le password. È possibile registrarsi con queste email e impostare una password personalizzata.

Il database contiene 8 utenti, 12 post, 12 commenti, 41 like e 22 relazioni di follow già popolate. Tutte le modifiche fatte attraverso l'API sono persistenti e sincronizzate in tempo reale.

## Sviluppo locale

Requisiti: **Node.js 20+** (consigliato 22) e npm.

### Setup del progetto

```bash
npm install
npm run dev
```

Il dev server parte su `http://localhost:5173/`.

### Setup del backend su Neon

1. **Verifica le credenziali Neon**:
   ```bash
   neon --version
   neon status
   ```

2. **Applica il database**:
   ```bash
   npm run db:setup
   ```

3. **Deploy del backend**:
   ```bash
   neon deploy --env .env.local
   ```

4. **Verifica l'API**:
   ```bash
   curl "https://<tua-funzione-neon>/health"
   ```

Altri comandi:

```bash
npm run typecheck   # solo controllo TypeScript
npm run build       # typecheck + build di produzione in dist/
npm run preview     # anteprima del build di produzione
```

Il build è cross-platform: `scripts/build.mjs` esegue typecheck e Vite in sequenza senza usare `&&`, che non funziona con PowerShell.

### Gestione delle branch

Per sviluppare su una nuova branch:

```bash
neon checkout mia-nuva-funcionalita --create
neon env pull  # Aggiorna le variabili d'ambiente
```

Questo crea una nuova branch con lo stesso schema e dati di partenza, permettendo di sviluppare in isolamento.

## Deploy

### Backend su Neon

Il backend è già deployato su Neon con la seguente configurazione:

- **API Function**: `https://br-frosty-feather-bht6iizc-api.compute.c-10.eu-central-1.aws.neon.tech/`
- **Database**: PostgreSQL su Neon Lakebase
- **Autenticazione**: Neon Auth abilitata
- **Realtime**: Query live abilitate
- **Storage**: Object Storage configurato

Per aggiornare il backend:

```bash
neon deploy --env .env.local
```

### Frontend su GitHub Pages

Il repository include il workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), che a ogni push sul branch `main` esegue typecheck, build e pubblica `dist/`.

1. Crea il repository su GitHub e pusha il progetto.
2. Vai su **Settings → Pages** e imposta **Source: GitHub Actions**.
3. Fai partire il workflow (push su `main` oppure **Actions → Deploy su GitHub Pages → Run workflow**).
4. La demo sarà disponibile su `https://<utente>.github.io/<repo>/`.

`vite.config.ts` usa `base: './'`, quindi il build funziona sia su un project site (`/repo/`) sia su un dominio custom o in una sottocartella, senza modificare la configurazione. Il manifest PWA usa `start_url: './'` e `scope: './'`.

Se il branch principale non si chiama `main`, aggiorna il trigger in `.github/workflows/deploy.yml`.

### Deploy completo (backend + frontend)

Per un deploy completo con backend e frontend:

1. **Backend**: Già deployato su Neon (aggiornare con `neon deploy`)
2. **Frontend**: Deployare su GitHub Pages o altro servizio hosting
3. **Configurazione CORS**: Assicurarsi che l'API permetta le origini del frontend

L'API è configurata per permettere le origini:
- `http://localhost:5173` (sviluppo)
- `http://127.0.0.1:5173` (sviluppo)
- `http://localhost:4173` (sviluppo)
- `https://slash-as.github.io` (esempio dominio frontend)

## PWA e offline

- Il service worker viene registrato **solo nel build di produzione** (`npm run preview` o GitHub Pages), non in sviluppo.
- Sono precachetati app shell, CSS, font, avatar e asset critici.
- Dopo la prima visita online la UI funziona offline, ma le operazioni richiedono connessione per comunicare con l'API.
- I dati vengono salvati sul server PostgreSQL, non solo localmente.
- Il caching è ottimizzato per prestazioni e riduzione del consumo dati.

## Struttura del progetto

```
.
├─ index.html                 # splash screen + entry point
├─ vite.config.ts             # Vite, base relativa e configurazione PWA
├─ scripts/build.mjs          # build cross-platform
├─ .neon                      # configurazione Neon (org, progetto, branch)
├─ neon.ts                    # configurazione servizi Neon
├─ .env.local                 # variabili d'ambiente (generato da neon env pull)
├─ public/
│  ├─ logo.svg, favicon, icone PWA
│  ├─ avatars/                # 8 avatar SVG
│  └─ media/                  # immagini SVG dei post demo
├─ src/
│  ├─ main.ts                 # boot, service worker, gestione errori
│  ├─ pwa.ts                  # prompt di installazione
│  ├─ styles.css              # design system e responsive
│  ├─ types.ts
│  ├─ db/
│  │  ├─ database.ts          # wrapper PostgreSQL con pg
│  │  ├─ repo.ts              # query e operazioni sul database
│  │  └─ seed.ts              # dati demo
│  └─ ui/
│     ├─ app.ts               # rendering, stato e azioni
│     ├─ format.ts            # escaping, date, hashtag, URL
│     └─ icons.ts             # icone SVG inline
├─ server/                   # backend su Neon Functions
│  ├─ index.ts               # API principale (Hono)
│  ├─ auth.ts                # autenticazione e gestione utenti
│  ├─ db.ts                  # connessione PostgreSQL
│  ├─ realtime.ts            # query Realtime
│  ├─ snapshot.ts            # snapshot del database
│  └─ storage.ts             # Object Storage
├─ db/
│  ├─ schema.sql             # schema PostgreSQL
│  └─ seed.sql               # dati demo iniziali
└─ .github/workflows/deploy.yml
```

## Limiti e considerazioni

- **Requisiti di rete**: L'applicazione richiede una connessione internet per comunicare con l'API e salvare dati sul server.
- **Autenticazione**: Richiede un account registrato per utilizzare tutte le funzionalità (i dati demo sono limitati).
- **Upload media**: I file caricati sono salvati su Neon Object Storage con limiti di dimensione (5MB per file).
- **Sicurezza**: Le policy di sicurezza dipendono dalla configurazione di Neon Auth e dalle regole API implementate.
- **Costi**: Neon ha un piano gratuito con limiti; per un social network in produzione con molti utenti sono necessari piani a pagamento.

## Tecnologie utilizzate

### Neon Services
- **Lakebase Postgres**: Database PostgreSQL scalabile con branching
- **Neon Auth**: Autenticazione con Better Auth
- **Neon Functions**: Serverless functions per l'API
- **Neon Realtime**: Query live per aggiornamenti in tempo reale
- **Neon Object Storage**: Storage per file e media

### Frontend
- **Vite**: Build tool veloce per modern web apps
- **TypeScript**: Type-safe JavaScript
- **PWA**: Progressive Web App con service worker
- **CSS vanilla**: Design system custom con tema dark glass

### Altri strumenti
- **pg**: PostgreSQL client per Node.js
- **Hono**: Lightweight web framework per l'API
- **Fontsource**: Font self-hosted ottimizzati
