# SIBANSOS RT — Full-Stack Implementation Design

Date: 2026-06-21
Source spec: `uploads/FP DPPL.pdf` ("Sistem Asisten Pengurus RT untuk Penentuan Prioritas dan Validasi Penerima Bantuan Sosial")

## 1. Goal

Implement all 10 use cases (UC01–UC10) from the DPPL document as a real, working full-stack web application, replacing the current client-only prototype (`app/*.jsx`, CDN React + Babel, `localStorage` as fake DB) which only covers the Pengurus RT side and has no authentication, no Warga portal, and no persistence beyond the browser.

## 2. Actors & Use Cases (from spec)

| Code | Use Case | Actor |
|------|----------|-------|
| UC01 | Mengatur Kuota Penerima Bantuan | Pengurus RT |
| UC02 | Memeriksa Validitas Data Warga | Pengurus RT |
| UC03 | Melihat Statistik Warga & Bantuan | Pengurus RT |
| UC04 | Melihat Riwayat Hasil Seleksi | Pengurus RT |
| UC05 | Mengubah Data Warga | Pengurus RT |
| UC06 | Menginput Data Administratif | Warga |
| UC07 | Mengunggah Foto Kondisi Rumah | Warga |
| UC08 | Melihat Status Penerimaan Bantuan | Warga |
| UC09 | Memperbarui Data Pribadi | Warga |
| UC10 | Memperbarui Status Penerimaan Bantuan | Pengurus RT |

System constraints from spec: max 50 KK, web-only (no native mobile), final acceptance decision stays with Pengurus RT (system is a decision-support tool, not an autonomous decision maker).

## 3. Architecture

- **Backend:** Node.js + Express. SQLite via `better-sqlite3` (file-based, zero external server). JWT in httpOnly cookies for sessions, `bcrypt` for password hashing, `multer` for photo uploads to local disk (`/uploads`), `exceljs` for Excel export, `pdfkit` for PDF export.
- **Frontend:** React + Vite + React Router. Fetch-based API client, auth context, role-based route guards. Visual language ported from the existing prototype (`styles.css`, toast notifications, card/table/drawer components) but rebuilt as proper components instead of CDN/Babel globals.
- **Scoring engine ("ModelAI" in the class diagram):** the deterministic weighted formula already in `app/data.js` (`faktorPrioritas`/`skorPrioritas`/`rekomendasiAI`) is ported verbatim to a backend module `server/scoring.js`. Weights: income/capita 40, dependents 20, house condition 22, ownership status 10, job stability 8. This keeps "Otoritas Keputusan tetap pada Pengurus RT" — the system only scores/ranks, RT decides.

## 4. Data Model (SQLite)

```
users (id, role['admin'|'warga'], username, password_hash, warga_id NULL, created_at)
warga (id, nama, nik UNIQUE, no_kk, alamat, no_telepon, created_at)
foto_rumah (id, warga_id, jenis['eksterior'|'interior'|'lingkungan'], file_path, deskripsi, uploaded_at)
data_administratif (warga_id PK, kategori_kerja, pekerjaan, pendapatan, tanggungan,
                     status_rumah, kondisi_rumah, skor_prioritas,
                     validitas['menunggu'|'valid'|'perlu_perbaikan'|'tidak_valid'],
                     catatan_verifikasi, chk_ktp, chk_kk, chk_pendapatan, chk_foto, updated_at)
bantuan (id, nama_bantuan, jenis_bantuan, kuota, nominal, periode, is_active, created_at)
hasil_seleksi (id, warga_id, bantuan_id, skor_prioritas, status['menunggu'|'penerima'|'cadangan'|'bukan'],
               catatan, tanggal_seleksi)
notifications (id, warga_id, message, created_at, read)
```

`bantuan.is_active` marks the current periode; only one active periode at a time. Opening a new periode (UC01) deactivates the previous one. `hasil_seleksi` rows tied to past (inactive) `bantuan` periods constitute the riwayat (UC04); rows tied to the active periode are what the "Status Penerima" screen (UC10) operates on.

## 5. API Surface

```
POST   /api/auth/register          (warga self-registration: nama, nik, no_kk, password)
POST   /api/auth/login             (nik/username + password, sets JWT cookie)
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/warga/me/profile
PUT    /api/warga/me/profile               (UC09 — resets validitas -> 'menunggu')
PUT    /api/warga/me/data-administratif    (UC06 — resets validitas -> 'menunggu')
POST   /api/warga/me/foto                  (UC07 — multipart, jenis=eksterior|interior|lingkungan)
GET    /api/warga/me/status                (UC08 — active periode hasil_seleksi for this warga)
GET    /api/warga/me/notifications

POST   /api/admin/bantuan                  (UC01 — open new periode + kuota)
GET    /api/admin/bantuan/active

GET    /api/admin/warga                    (list + filter validitas + search nama/nik)
GET    /api/admin/warga/:id                (detail incl. data_administratif + foto)
PUT    /api/admin/warga/:id/validitas       (UC02 — set validitas + catatan + checklist)
PUT    /api/admin/warga/:id                 (UC05 — edit data; resets validitas -> 'menunggu')
POST   /api/admin/skor-preview              (stateless live score calc for UC05 form)

GET    /api/admin/seleksi                   (active periode, ranked by skor desc)
PUT    /api/admin/seleksi/:id               (UC10 — set status + catatan; creates notification)

GET    /api/admin/riwayat?periode=          (UC04 — past periode hasil_seleksi)
GET    /api/admin/riwayat/:id

GET    /api/admin/statistik                 (UC03 — counts, income distribution, validity donut, priority histogram)
GET    /api/admin/statistik/export?format=pdf|excel
```

All mutating endpoints validate input server-side (mirrors the "Apakah data valid?" decision points in the activity diagrams) and return 400 with field-level errors on failure.

## 6. Frontend Routes

- Public: `/login`, `/daftar`
- Warga (role-guarded): `/warga/data` (UC06), `/warga/foto` (UC07), `/warga/status` (UC08), `/warga/profil` (UC09)
- Pengurus RT (role-guarded): `/admin/statistik` (UC03), `/admin/verifikasi` (UC02), `/admin/status` (UC10), `/admin/riwayat` (UC04), `/admin/warga/:id/ubah` (UC05), `/admin/kuota` (UC01)

## 7. Error Handling

- Validation errors (missing/invalid fields, photo too large/wrong format, text length bounds where applicable) → 400 with field-level messages, surfaced inline in forms.
- Quota overflow when assigning "Penerima" beyond kuota → non-blocking warning banner (UI proceeds but flags "Over Quota"), per spec's quota-bar behavior — RT is allowed to override since final authority is human.
- Attempting to set `hasil_seleksi` status for a warga whose `validitas` is `menunggu`/`perlu_perbaikan` → warning banner, but not hard-blocked (matches spec wording "memunculkan spanduk peringatan", not a hard error).
- Auth failures → 401, route guards redirect to `/login`.

## 8. Testing

- Backend: unit tests for `scoring.js` (known input → expected score bands), integration tests per use case (register/login, data-administratif submit + validitas reset, photo upload, validitas update, quota creation, seleksi status update + notification creation, riwayat filtering, statistik aggregation).
- Frontend: smoke tests for critical flows (warga register → submit data → see "menunggu" status; admin verify → set valid; admin set penerima → warga sees status + notification).

## 9. Out of Scope

- Native mobile apps (explicitly excluded by spec).
- Real SMS/email notifications — in-app notification record only (spec says "mensimulasikan proses pengiriman notifikasi").
- Multi-RT/multi-tenant support — single RT scope, max 50 KK per spec.
