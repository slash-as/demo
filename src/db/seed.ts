import type { Database } from 'sql.js';

/**
 * Dati demo.
 * Gli ID sono espliciti per rendere leggibili le relazioni tra tabelle.
 */

const NOW = Date.now();

const minutesAgo = (minutes: number): string =>
  new Date(NOW - minutes * 60_000).toISOString();

const daysAgo = (days: number): string => minutesAgo(days * 24 * 60);

interface SeedUser {
  id: number;
  username: string;
  email: string;
  bio: string;
  avatarUrl: string;
  createdAt: string;
}

const USERS: SeedUser[] = [
  {
    id: 1,
    username: 'aurora',
    email: 'aurora@nebula.demo',
    bio: 'Product designer. Curiosa cronica, colleziono tramonti e idee a metà.',
    avatarUrl: 'avatars/aurora.svg',
    createdAt: daysAgo(240),
  },
  {
    id: 2,
    username: 'leo',
    email: 'leo@nebula.demo',
    bio: 'Frontend engineer. Costruisco cose per il web e dimentico di fare commit.',
    avatarUrl: 'avatars/leo.svg',
    createdAt: daysAgo(220),
  },
  {
    id: 3,
    username: 'mia',
    email: 'mia@nebula.demo',
    bio: 'Fotografa di strada. Luce naturale, caos urbano, caffè ghiacciato.',
    avatarUrl: 'avatars/mia.svg',
    createdAt: daysAgo(200),
  },
  {
    id: 4,
    username: 'noah',
    email: 'noah@nebula.demo',
    bio: 'Producer e sound designer. Bassi profondi, playlist lunghe.',
    avatarUrl: 'avatars/noah.svg',
    createdAt: daysAgo(180),
  },
  {
    id: 5,
    username: 'sofia',
    email: 'sofia@nebula.demo',
    bio: 'Viaggio lento, bagagli leggeri. 23 paesi, mille taccuini.',
    avatarUrl: 'avatars/sofia.svg',
    createdAt: daysAgo(160),
  },
  {
    id: 6,
    username: 'kai',
    email: 'kai@nebula.demo',
    bio: 'Illustratore. Guardo le nuvole e disegno mostri gentili.',
    avatarUrl: 'avatars/kai.svg',
    createdAt: daysAgo(140),
  },
  {
    id: 7,
    username: 'emma',
    email: 'emma@nebula.demo',
    bio: 'Cucino per le persone che amo. Il burro è un linguaggio.',
    avatarUrl: 'avatars/emma.svg',
    createdAt: daysAgo(120),
  },
  {
    id: 8,
    username: 'davide',
    email: 'davide@nebula.demo',
    bio: 'Backend dev. Debuggo meglio alle 2 di notte. Purtroppo.',
    avatarUrl: 'avatars/davide.svg',
    createdAt: daysAgo(100),
  },
];

interface SeedPost {
  id: number;
  userId: number;
  content: string;
  mediaUrl: string | null;
  createdAt: string;
}

const POSTS: SeedPost[] = [
  {
    id: 1,
    userId: 2,
    content:
      'Ho passato la serata a inseguire un bug che era... un punto e virgola. Il vero nemico era dentro di me. #devlife',
    mediaUrl: null,
    createdAt: minutesAgo(18),
  },
  {
    id: 2,
    userId: 3,
    content:
      'Golden hour sul tetto. A volte la città si dimentica di essere rumorosa. 🌇',
    mediaUrl: 'media/golden-hour.svg',
    createdAt: minutesAgo(48),
  },
  {
    id: 3,
    userId: 1,
    content:
      'Nuovo progetto: un social in una singola pagina, con SQLite nel browser. Sto scherzando? No. #buildinpublic #webdev',
    mediaUrl: 'media/mesh.svg',
    createdAt: minutesAgo(120),
  },
  {
    id: 4,
    userId: 6,
    content:
      'Sketch del giorno: un piccolo guardiano delle nuvole. Ha paura dei tuoni, quindi li disegna. #illustration',
    mediaUrl: null,
    createdAt: minutesAgo(180),
  },
  {
    id: 5,
    userId: 5,
    content:
      "Kyoto dopo la pioggia. Le luci si riflettono sull'asfalto e sembra di camminare dentro una fotografia. #travel",
    mediaUrl: 'media/kyoto.svg',
    createdAt: minutesAgo(300),
  },
  {
    id: 6,
    userId: 4,
    content:
      'Nuova traccia in arrivo. Ho campionato il rumore della macchina del caffè e ora sembra una cattedrale. #music #studio',
    mediaUrl: 'media/studio.svg',
    createdAt: minutesAgo(420),
  },
  {
    id: 7,
    userId: 7,
    content:
      'Ragù domenicale: sei ore, una casa che profuma, zero rimpianti. Chi passa? 🍝',
    mediaUrl: null,
    createdAt: minutesAgo(540),
  },
  {
    id: 8,
    userId: 8,
    content:
      'Oggi ho spiegato IndexedDB a un collega. Cinque minuti dopo stava già cancellando il database. Non era un incidente. #javascript',
    mediaUrl: null,
    createdAt: minutesAgo(660),
  },
  {
    id: 9,
    userId: 3,
    content:
      'Dietro le quinte di ieri. La parte migliore della fotografia è aspettare. #bts',
    mediaUrl: null,
    createdAt: minutesAgo(1_440),
  },
  {
    id: 10,
    userId: 2,
    content:
      'Qualcuno ha detto WebAssembly? Sto esplorando SQLite nel browser per una demo. Il futuro è strano e mi piace. #webassembly',
    mediaUrl: null,
    createdAt: minutesAgo(1_500),
  },
  {
    id: 11,
    userId: 1,
    content:
      'Il mio setup ideale: una scrivania vuota, una finestra grande, un problema interessante. ☕️',
    mediaUrl: null,
    createdAt: minutesAgo(2_880),
  },
  {
    id: 12,
    userId: 6,
    content:
      'Palette di oggi: viola alle 18:42, ciano alle 18:47, rimpianto alle 19:00. #design',
    mediaUrl: null,
    createdAt: minutesAgo(3_000),
  },
];

const FOLLOWS: Array<[followerId: number, followeeId: number]> = [
  [1, 2],
  [1, 3],
  [1, 5],
  [1, 6],
  [2, 1],
  [2, 3],
  [3, 1],
  [3, 2],
  [3, 6],
  [4, 1],
  [4, 3],
  [5, 1],
  [5, 2],
  [5, 3],
  [5, 6],
  [6, 1],
  [6, 3],
  [7, 3],
  [7, 5],
  [8, 1],
  [8, 2],
  [8, 4],
];

const LIKES: Record<number, number[]> = {
  1: [1, 3, 4, 5, 6],
  2: [1, 2, 4, 6, 7, 8],
  3: [2, 3, 4, 5, 6],
  4: [1, 3],
  5: [1, 2, 3, 6, 7],
  6: [1, 3, 8],
  7: [1, 3, 4, 5],
  8: [1, 2],
  9: [5, 6],
  10: [1, 3, 8],
  11: [2, 7],
  12: [3, 5],
};

interface SeedComment {
  postId: number;
  userId: number;
  content: string;
  createdAt: string;
}

const COMMENTS: SeedComment[] = [
  {
    postId: 1,
    userId: 1,
    content: 'Il punto e virgola era innocente.',
    createdAt: minutesAgo(12),
  },
  {
    postId: 1,
    userId: 3,
    content: 'Classico. Io ho perso due ore per un import.',
    createdAt: minutesAgo(8),
  },
  {
    postId: 2,
    userId: 1,
    content: 'Questa luce è illegale.',
    createdAt: minutesAgo(40),
  },
  {
    postId: 2,
    userId: 5,
    content: 'Sembra un dipinto.',
    createdAt: minutesAgo(30),
  },
  {
    postId: 3,
    userId: 2,
    content: 'SQLite nel browser è magia nera, ma funziona.',
    createdAt: minutesAgo(100),
  },
  {
    postId: 3,
    userId: 6,
    content: 'Voglio vederlo!',
    createdAt: minutesAgo(90),
  },
  {
    postId: 5,
    userId: 3,
    content: 'Kyoto è nella lista da troppo tempo.',
    createdAt: minutesAgo(260),
  },
  {
    postId: 5,
    userId: 1,
    content: 'Che colori.',
    createdAt: minutesAgo(240),
  },
  {
    postId: 6,
    userId: 8,
    content: 'La cattedrale del caffè, la mia nuova band.',
    createdAt: minutesAgo(380),
  },
  {
    postId: 7,
    userId: 5,
    content: 'Arrivo. Porto il pane.',
    createdAt: minutesAgo(500),
  },
  {
    postId: 8,
    userId: 2,
    content: 'Cinque minuti è ottimista.',
    createdAt: minutesAgo(620),
  },
  {
    postId: 10,
    userId: 1,
    content: 'Il futuro è strano e mi piace.',
    createdAt: minutesAgo(1_400),
  },
];

export function seedDatabase(db: Database): void {
  db.run('BEGIN TRANSACTION;');

  try {
    for (const user of USERS) {
      db.run(
        `INSERT INTO USER (id, username, email, bio, avatar_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user.id, user.username, user.email, user.bio, user.avatarUrl, user.createdAt],
      );
    }

    for (const post of POSTS) {
      db.run(
        `INSERT INTO POST (id, user_id, content, media_url, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [post.id, post.userId, post.content, post.mediaUrl, post.createdAt],
      );
    }

    for (const [postId, userIds] of Object.entries(LIKES)) {
      for (const userId of userIds) {
        db.run(
          `INSERT INTO "LIKE" (user_id, post_id, created_at) VALUES (?, ?, ?)`,
          [userId, Number(postId), daysAgo(1)],
        );
      }
    }

    for (const [followerId, followeeId] of FOLLOWS) {
      db.run(
        `INSERT INTO FOLLOW (follower_id, followee_id, created_at) VALUES (?, ?, ?)`,
        [followerId, followeeId, daysAgo(30)],
      );
    }

    for (const comment of COMMENTS) {
      db.run(
        `INSERT INTO COMMENT (post_id, user_id, content, created_at)
         VALUES (?, ?, ?, ?)`,
        [comment.postId, comment.userId, comment.content, comment.createdAt],
      );
    }

    db.run('COMMIT;');
  } catch (error) {
    db.run('ROLLBACK;');
    throw error;
  }
}
