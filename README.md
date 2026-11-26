# ADS (Abi Digital Solutions) — v12 "Tukang Digital"
Website HTML + CSS + JavaScript murni (tanpa build, tanpa library). Konsep: walnut hangat + kuningan + motif penggaris, dengan mode gelap & terang otomatis.

## Pasang
Upload SEMUA isi folder ini ke root repository GitHub (timpa file lama, termasuk `assets/`), lalu pastikan `bugs.js` ikut terupload. Setelah publish, buka sekali lalu muat ulang (service worker sudah naik ke `ads-v12`).

## Yang berubah di v12
- Tanpa layar loading (sebelumnya menahan halaman min. 2,1 detik), tanpa cahaya kursor, tanpa blur/backdrop-filter. v17: loading screen 4 detik "bengkel digital" (inline di index.html); serangga = capung & lebah lewat `bugs.js` (satu canvas, ±6 serangga, berhenti saat tab tersembunyi / reduce-motion).
- Foto kayu hanya di hero, CTA, footer; sisanya warna solid, jadi teks lebih terbaca.
- Font: Bricolage Grotesque (judul) + Plus Jakarta Sans (isi).
- Hero: laptop + HP + layar belakang dari screenshot proyek asli, statistik berbentuk penggaris.
- Layanan jadi daftar baris; proses kerja bernomor; FAQ bergaris; portfolio 2 kolom di HP (halaman HP ±32% lebih pendek).
- Tampil baik di HP (360–430px), tablet, mode "situs desktop" di HP (±980px), dan PC.

## Edit konten (bagian `CONFIG` di `script.js`)
`whatsapp`, `experience`, `contacts`, `projects`, `hero` (3 slug: laptop, HP, layar belakang), `services`, `skills`, `points`, `steps`. Tambah project: salin satu blok + screenshot 800x500 `.webp` di `assets/projects/`.

## Warna & tema
Token ada di `:root` (gelap) dan `[data-theme=light]` paling atas `style.css`. Kekuatan tekstur hero: `--wood-o`.

## PWA
`manifest.webmanifest`, `sw.js`, `icons/`. Jika file diubah, naikkan `VER` di `sw.js`.
