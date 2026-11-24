# ABY Digital
Website portfolio & katalog jasa (HTML + CSS + JavaScript murni, tanpa build). Desain 2026 bertema KAYU: mode terang (oak) & gelap (walnut) otomatis, tekstur papan kayu, bento layanan, portfolio dengan screenshot nyata + preview langsung.

## Cara pakai
1. Buka `index.html` langsung di browser.
2. Upload SEMUA isi folder ini ke root repository GitHub (timpa file lama, termasuk folder `assets/`).
3. Settings → Pages → Deploy from branch → `main` / root.

## Edit data (semua di bagian `CONFIG` paling atas `script.js`)
- `whatsapp` : nomor WhatsApp (satu-satunya tempat).
- `experience` : isi kalimat pengalaman Anda. Kosong = baris disembunyikan.
- `contacts` : isi email / instagram / facebook / github / website. Yang kosong otomatis TIDAK ditampilkan.
- `projects` : 19 project nyata dari benyoriki.com. Tambah project = salin 1 blok, taruh screenshot 800x500 (.webp) di `assets/projects/<slug>.webp`.
- `hero` : 3 slug project yang tampil di visual hero.
- `services`, `skills`, `points`, `steps`.

## Tema & tekstur kayu
- Warna ada di `:root` (gelap) dan `[data-theme=light]` (terang) paling atas `style.css`.
- Tekstur: `assets/tex/wood-dark.jpg` & `wood-light.jpg` (tile 512px, ±35 KB). Ganti file untuk mengubah motif kayu.
- Logo: `assets/logo-*.webp`, `favicon.png`, `apple-touch-icon.png`, `icons/`.

## Foto profil (opsional)
Bagian Tentang memakai kartu brand. Untuk foto sendiri: taruh di `assets/profile.jpg` lalu isi `photo: "assets/profile.jpg"` di CONFIG.

## PWA (bisa di-install)
`manifest.webmanifest`, `sw.js`, folder `icons/`. Setelah publish di HTTPS (GitHub Pages), tombol Install muncul di HP/PC. iPhone: Bagikan → Tambah ke Layar Utama. Jika file diubah, naikkan `VER` di `sw.js` (mis. aby-v1) agar cache diperbarui.

## Setelah publish
`og:image` / `og:url` di `index.html` sudah mengarah ke https://benyoriki.github.io/Digital/ — ganti jika domain berubah.
