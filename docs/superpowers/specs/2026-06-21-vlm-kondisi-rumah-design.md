# Saran Klasifikasi Kondisi Rumah via VLM Lokal — Design

Date: 2026-06-21
Builds on: `docs/superpowers/specs/2026-06-21-sibansos-rt-fullstack-design.md`

## 1. Goal

Tambahkan saran otomatis kondisi rumah (Layak / Kurang Layak / Tidak Layak) berdasarkan foto yang diunggah warga (UC07), menggunakan Vision-Language Model (VLM) lokal yang ringan, sebagai bahan pertimbangan tambahan bagi Pengurus RT saat memeriksa validitas data (UC02) — bukan pengganti keputusan manual RT.

## 2. Hubungan dengan Batasan Sistem di PDF

PDF (Batasan Sistem) menyatakan: *"Kualitas Input Visual: Kegunaan foto kondisi rumah sebagai bahan verifikasi sepenuhnya bergantung pada penilaian manual pengurus RT"* dan *"Otoritas Keputusan: Sistem berfungsi sebagai alat bantu pengelolaan data. Keputusan akhir... tetap berada pada wewenang pengurus RT."*

Konsekuensi desain: hasil VLM **tidak pernah** menulis ke kolom `kondisi_rumah` (nilai manual yang dipakai untuk skor prioritas). Hasil VLM disimpan di kolom terpisah dan ditampilkan sebagai saran berlabel jelas, murni informatif.

## 3. Arsitektur

- **Runtime:** Ollama (proses lokal terpisah, diasumsikan sudah berjalan di `http://localhost:11434`), model default `moondream` (dikonfigurasi via env `OLLAMA_VLM_MODEL`).
- **Modul baru:** `server/src/vlm.js` — satu-satunya tempat yang tahu cara bicara dengan Ollama. Mengekspor:
  - `classifyPhoto(absoluteFilePath)` → `Promise<{ kondisi, alasan } | null>`. Mengirim satu gambar (base64) + prompt ke Ollama, parse JSON dari respons. Mengembalikan `null` pada error/timeout/parse gagal apa pun (tidak pernah throw ke pemanggil).
  - `classifyKondisiRumah(fotoRows)` → `Promise<{ kondisi, alasan } | null>`. Memanggil `classifyPhoto` untuk tiap foto (di-`Promise.allSettled`, paralel), mengambil hasil dengan tingkat keparahan tertinggi (`Tidak Layak` > `Kurang Layak` > `Layak`). Jika semua foto gagal diklasifikasi, kembalikan `null`.
- **Trigger:** di `server/src/routes/warga.js`, route `POST /me/foto` — setelah insert foto baru, cek apakah warga ini sudah punya foto untuk ketiga jenis (`eksterior`, `interior`, `lingkungan`), dihitung dari `SELECT DISTINCT jenis`. Kalau iya (baik baru lengkap untuk pertama kali, maupun warga meng-upload ulang salah satu foto setelah sebelumnya sudah lengkap), panggil `classifyKondisiRumah(...)` dengan foto **terbaru per jenis** (1 foto eksterior + 1 interior + 1 lingkungan, yang paling baru kalau ada lebih dari satu per jenis), **tanpa `await`** (fire-and-forget, `.then()` untuk update DB, `.catch()` untuk diam-diam diabaikan) — respons HTTP ke warga tidak menunggu hasil VLM. Re-upload otomatis menghasilkan saran baru yang menimpa saran lama.
- **Penyimpanan:** dua kolom baru di `data_administratif`: `ai_kondisi_saran TEXT`, `ai_kondisi_alasan TEXT` (nullable, default `NULL`). Migrasi dilakukan dengan cek `pragma table_info` di `db.js` (tambah kolom kalau belum ada), supaya database lama yang sudah ada tidak rusak.
- **Eksposur API:** `WARGA_JOIN_SELECT` dan `rowToWarga()` di `server/src/routes/admin.js` diperluas untuk menyertakan kedua kolom ini, sehingga `GET /api/admin/warga` dan `GET /api/admin/warga/:id` ikut mengembalikannya.

## 4. Prompt VLM

Prompt per foto (Bahasa Indonesia, instruksi format JSON ketat):

```
Anda menilai kondisi kelayakan rumah dari sebuah foto untuk program bantuan
sosial. Klasifikasikan foto ini sebagai salah satu dari: "Layak", "Kurang
Layak", atau "Tidak Layak". Balas HANYA dengan JSON valid, tanpa teks lain,
format: {"kondisi": "<salah satu kategori>", "alasan": "<1 kalimat singkat>"}
```

Parsing: ekstrak blok `{...}` pertama dari respons model (model kecil kadang menambah teks pembuka), `JSON.parse`, validasi `kondisi` adalah salah satu dari 3 nilai yang sah — kalau tidak, anggap gagal (`null`).

## 5. Frontend

`web/src/pages/admin/Verifikasi.jsx` — di drawer pemeriksaan, tepat di bawah field "Kondisi Rumah" pada `field-grid`, tambahkan kotak saran kecil (ikon sparkle, warna netral/biru muda — bukan warna status hijau/merah supaya tidak disalahartikan sebagai keputusan resmi):

> 💡 **Saran Asisten AI (VLM):** Kurang Layak — *"dinding tampak retak dan atap sebagian bocor"*

Kotak ini hanya muncul kalau `ai_kondisi_saran` tidak null. Tidak ada tombol "terapkan" — RT yang mau mengoreksi `kondisi_rumah` tetap lewat alur UC05 (Ubah Data Warga) yang sudah ada, secara manual.

## 6. Error Handling

| Skenario | Perilaku |
|---|---|
| Ollama tidak jalan / connection refused | `fetch` reject → ditangkap di `classifyPhoto`, kembalikan `null` |
| Ollama jalan tapi timeout (>15s) | `AbortController` timeout → ditangkap, kembalikan `null` |
| Respons model bukan JSON valid | `JSON.parse` gagal → ditangkap, kembalikan `null` |
| Respons JSON valid tapi `kondisi` di luar 3 nilai sah | dianggap gagal, kembalikan `null` |
| Salah satu dari 3 foto gagal diklasifikasi, 2 lainnya berhasil | tetap proses, ambil yang paling parah dari yang berhasil |
| Semua 3 foto gagal diklasifikasi | `classifyKondisiRumah` kembalikan `null`, kolom `ai_kondisi_saran`/`ai_kondisi_alasan` tetap `NULL`, UI tidak menampilkan kotak saran |

Di semua skenario di atas, endpoint `POST /api/warga/me/foto` tetap mengembalikan `201` seperti biasa — proses VLM berjalan di belakang dan tidak pernah memengaruhi response upload foto.

## 7. Testing

- `server/tests/vlm.test.js`: mock `global.fetch` untuk skenario sukses, JSON tidak valid, kategori tidak dikenal, dan network error/timeout — verifikasi `classifyPhoto` dan agregasi keparahan di `classifyKondisiRumah`.
- `server/tests/warga-routes.test.js` (tambahan test): `jest.mock('../src/vlm')` supaya tidak perlu Ollama nyala. Verifikasi: (a) `classifyKondisiRumah` hanya dipanggil setelah foto jenis ke-3 yang berbeda terupload, bukan di upload ke-1/ke-2; (b) saat mock resolve dengan nilai, `data_administratif.ai_kondisi_saran` ter-update; (c) saat mock reject, endpoint tetap balas `201` dan kolom tetap `NULL`.

## 8. Out of Scope

- Tidak ada deteksi/OCR KTP atau KK — di luar lingkup foto yang sudah ada di sistem (hanya foto kondisi rumah, bukan dokumen identitas).
- Tidak ada UI untuk memilih/mengganti model VLM dari aplikasi — hanya lewat env var `OLLAMA_VLM_MODEL`.
- Tidak menginstal atau mem-bundle Ollama — diasumsikan sudah terpasang & berjalan di mesin yang menjalankan `server/`; kalau tidak ada, fitur ini diam-diam tidak aktif (lihat §6).
