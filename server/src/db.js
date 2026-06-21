const path = require('path');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'sibansos.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'warga')),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    warga_id INTEGER REFERENCES warga(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS warga (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    nik TEXT NOT NULL UNIQUE,
    no_kk TEXT,
    alamat TEXT,
    no_telepon TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS foto_rumah (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warga_id INTEGER NOT NULL REFERENCES warga(id),
    jenis TEXT NOT NULL CHECK (jenis IN ('eksterior', 'interior', 'lingkungan')),
    file_path TEXT NOT NULL,
    deskripsi TEXT,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS data_administratif (
    warga_id INTEGER PRIMARY KEY REFERENCES warga(id),
    kategori_kerja TEXT CHECK (kategori_kerja IN ('tetap', 'serabutan', 'tidak_bekerja')),
    pekerjaan TEXT,
    pendapatan INTEGER,
    tanggungan INTEGER,
    status_rumah TEXT CHECK (status_rumah IN ('Milik Sendiri', 'Kontrak', 'Menumpang')),
    kondisi_rumah TEXT CHECK (kondisi_rumah IN ('Layak', 'Kurang Layak', 'Tidak Layak')),
    skor_prioritas REAL,
    validitas TEXT NOT NULL DEFAULT 'menunggu'
      CHECK (validitas IN ('menunggu', 'valid', 'perlu_perbaikan', 'tidak_valid')),
    catatan_verifikasi TEXT,
    chk_ktp INTEGER NOT NULL DEFAULT 0,
    chk_kk INTEGER NOT NULL DEFAULT 0,
    chk_pendapatan INTEGER NOT NULL DEFAULT 0,
    chk_foto INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bantuan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_bantuan TEXT NOT NULL,
    jenis_bantuan TEXT,
    kuota INTEGER NOT NULL,
    nominal INTEGER,
    periode TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hasil_seleksi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warga_id INTEGER NOT NULL REFERENCES warga(id),
    bantuan_id INTEGER NOT NULL REFERENCES bantuan(id),
    skor_prioritas REAL,
    status TEXT NOT NULL DEFAULT 'menunggu'
      CHECK (status IN ('menunggu', 'penerima', 'cadangan', 'bukan')),
    catatan TEXT,
    tanggal_seleksi TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (warga_id, bantuan_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warga_id INTEGER NOT NULL REFERENCES warga(id),
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    read INTEGER NOT NULL DEFAULT 0
  );
`);

const adminExists = db.prepare("SELECT 1 FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync('pengurus123', 10);
  db.prepare(
    'INSERT INTO users (role, username, password_hash) VALUES (?, ?, ?)'
  ).run('admin', 'pengurus', hash);
}

module.exports = db;
