-- Dati demo condivisi: stessi contenuti del vecchio seed SQL.js,
-- ma salvati in Postgres e visibili a tutti i client autenticati.

TRUNCATE nebula.users RESTART IDENTITY CASCADE;

INSERT INTO nebula.users (id, username, email, bio, avatar_url, created_at) VALUES
  (1, 'aurora', 'aurora@nebula.demo', 'Product designer. Curiosa cronica, colleziono tramonti e idee a metà.', 'avatars/aurora.svg', now() - interval '240 days'),
  (2, 'leo', 'leo@nebula.demo', 'Frontend engineer. Costruisco cose per il web e dimentico di fare commit.', 'avatars/leo.svg', now() - interval '220 days'),
  (3, 'mia', 'mia@nebula.demo', 'Fotografa di strada. Luce naturale, caos urbano, caffè ghiacciato.', 'avatars/mia.svg', now() - interval '200 days'),
  (4, 'noah', 'noah@nebula.demo', 'Producer e sound designer. Bassi profondi, playlist lunghe.', 'avatars/noah.svg', now() - interval '180 days'),
  (5, 'sofia', 'sofia@nebula.demo', 'Viaggio lento, bagagli leggeri. 23 paesi, mille taccuini.', 'avatars/sofia.svg', now() - interval '160 days'),
  (6, 'kai', 'kai@nebula.demo', 'Illustratore. Guardo le nuvole e disegno mostri gentili.', 'avatars/kai.svg', now() - interval '140 days'),
  (7, 'emma', 'emma@nebula.demo', 'Cucino per le persone che amo. Il burro è un linguaggio.', 'avatars/emma.svg', now() - interval '120 days'),
  (8, 'davide', 'davide@nebula.demo', 'Backend dev. Debuggo meglio alle 2 di notte. Purtroppo.', 'avatars/davide.svg', now() - interval '100 days');

INSERT INTO nebula.posts (id, user_id, content, media_url, created_at) VALUES
  (1, 2, 'Ho passato la serata a inseguire un bug che era... un punto e virgola. Il vero nemico era dentro di me. #devlife', NULL, now() - interval '18 minutes'),
  (2, 3, 'Golden hour sul tetto. A volte la città si dimentica di essere rumorosa. 🌇', 'media/golden-hour.svg', now() - interval '48 minutes'),
  (3, 1, 'Nuovo progetto: un social in una singola pagina, con SQLite nel browser. Sto scherzando? No. #buildinpublic #webdev', 'media/mesh.svg', now() - interval '120 minutes'),
  (4, 6, 'Sketch del giorno: un piccolo guardiano delle nuvole. Ha paura dei tuoni, quindi li disegna. #illustration', NULL, now() - interval '180 minutes'),
  (5, 5, 'Kyoto dopo la pioggia. Le luci si riflettono sull''asfalto e sembra di camminare dentro una fotografia. #travel', 'media/kyoto.svg', now() - interval '300 minutes'),
  (6, 4, 'Nuova traccia in arrivo. Ho campionato il rumore della macchina del caffè e ora sembra una cattedrale. #music #studio', 'media/studio.svg', now() - interval '420 minutes'),
  (7, 7, 'Ragù domenicale: sei ore, una casa che profuma, zero rimpianti. Chi passa? 🍝', NULL, now() - interval '540 minutes'),
  (8, 8, 'Oggi ho spiegato IndexedDB a un collega. Cinque minuti dopo stava già cancellando il database. Non era un incidente. #javascript', NULL, now() - interval '660 minutes'),
  (9, 3, 'Dietro le quinte di ieri. La parte migliore della fotografia è aspettare. #bts', NULL, now() - interval '1440 minutes'),
  (10, 2, 'Qualcuno ha detto WebAssembly? Sto esplorando SQLite nel browser per una demo. Il futuro è strano e mi piace. #webassembly', NULL, now() - interval '1500 minutes'),
  (11, 1, 'Il mio setup ideale: una scrivania vuota, una finestra grande, un problema interessante. ☕️', NULL, now() - interval '2880 minutes'),
  (12, 6, 'Palette di oggi: viola alle 18:42, ciano alle 18:47, rimpianto alle 19:00. #design', NULL, now() - interval '3000 minutes');

INSERT INTO nebula.follows (follower_id, followee_id, created_at) VALUES
  (1, 2, now() - interval '30 days'), (1, 3, now() - interval '30 days'),
  (1, 5, now() - interval '30 days'), (1, 6, now() - interval '30 days'),
  (2, 1, now() - interval '30 days'), (2, 3, now() - interval '30 days'),
  (3, 1, now() - interval '30 days'), (3, 2, now() - interval '30 days'),
  (3, 6, now() - interval '30 days'), (4, 1, now() - interval '30 days'),
  (4, 3, now() - interval '30 days'), (5, 1, now() - interval '30 days'),
  (5, 2, now() - interval '30 days'), (5, 3, now() - interval '30 days'),
  (5, 6, now() - interval '30 days'), (6, 1, now() - interval '30 days'),
  (6, 3, now() - interval '30 days'), (7, 3, now() - interval '30 days'),
  (7, 5, now() - interval '30 days'), (8, 1, now() - interval '30 days'),
  (8, 2, now() - interval '30 days'), (8, 4, now() - interval '30 days');

INSERT INTO nebula.likes (user_id, post_id, created_at) VALUES
  (1, 1, now() - interval '1 day'), (3, 1, now() - interval '1 day'),
  (4, 1, now() - interval '1 day'), (5, 1, now() - interval '1 day'),
  (6, 1, now() - interval '1 day'),
  (1, 2, now() - interval '1 day'), (2, 2, now() - interval '1 day'),
  (4, 2, now() - interval '1 day'), (6, 2, now() - interval '1 day'),
  (7, 2, now() - interval '1 day'), (8, 2, now() - interval '1 day'),
  (2, 3, now() - interval '1 day'), (3, 3, now() - interval '1 day'),
  (4, 3, now() - interval '1 day'), (5, 3, now() - interval '1 day'),
  (6, 3, now() - interval '1 day'),
  (1, 4, now() - interval '1 day'), (3, 4, now() - interval '1 day'),
  (1, 5, now() - interval '1 day'), (2, 5, now() - interval '1 day'),
  (3, 5, now() - interval '1 day'), (6, 5, now() - interval '1 day'),
  (7, 5, now() - interval '1 day'),
  (1, 6, now() - interval '1 day'), (3, 6, now() - interval '1 day'),
  (8, 6, now() - interval '1 day'),
  (1, 7, now() - interval '1 day'), (3, 7, now() - interval '1 day'),
  (4, 7, now() - interval '1 day'), (5, 7, now() - interval '1 day'),
  (1, 8, now() - interval '1 day'), (2, 8, now() - interval '1 day'),
  (5, 9, now() - interval '1 day'), (6, 9, now() - interval '1 day'),
  (1, 10, now() - interval '1 day'), (3, 10, now() - interval '1 day'),
  (8, 10, now() - interval '1 day'),
  (2, 11, now() - interval '1 day'), (7, 11, now() - interval '1 day'),
  (3, 12, now() - interval '1 day'), (5, 12, now() - interval '1 day');

INSERT INTO nebula.comments (post_id, user_id, content, created_at) VALUES
  (1, 1, 'Il punto e virgola era innocente.', now() - interval '12 minutes'),
  (1, 3, 'Classico. Io ho perso due ore per un import.', now() - interval '8 minutes'),
  (2, 1, 'Questa luce è illegale.', now() - interval '40 minutes'),
  (2, 5, 'Sembra un dipinto.', now() - interval '30 minutes'),
  (3, 2, 'SQLite nel browser è magia nera, ma funziona.', now() - interval '100 minutes'),
  (3, 6, 'Voglio vederlo!', now() - interval '90 minutes'),
  (5, 3, 'Kyoto è nella lista da troppo tempo.', now() - interval '260 minutes'),
  (5, 1, 'Che colori.', now() - interval '240 minutes'),
  (6, 8, 'La cattedrale del caffè, la mia nuova band.', now() - interval '380 minutes'),
  (7, 5, 'Arrivo. Porto il pane.', now() - interval '500 minutes'),
  (8, 2, 'Cinque minuti è ottimista.', now() - interval '620 minutes'),
  (10, 1, 'Il futuro è strano e mi piace.', now() - interval '1400 minutes');

SELECT setval(pg_get_serial_sequence('nebula.users', 'id'), COALESCE(MAX(id), 1)) FROM nebula.users;
SELECT setval(pg_get_serial_sequence('nebula.posts', 'id'), COALESCE(MAX(id), 1)) FROM nebula.posts;
SELECT setval(pg_get_serial_sequence('nebula.comments', 'id'), COALESCE(MAX(id), 1)) FROM nebula.comments;
