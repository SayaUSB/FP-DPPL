# SIBANSOS RT Full-Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 10 use cases (UC01-UC10) from `uploads/FP DPPL.pdf` as a working full-stack app: Express+SQLite backend, React+Vite frontend, replacing the client-only prototype in `app/`.

**Architecture:** `server/` is a standalone Node/Express API backed by SQLite (`better-sqlite3`), JWT-cookie auth, multer file uploads, exceljs/pdfkit exports. `web/` is a Vite React SPA consuming that API. The scoring formula from `app/data.js` is ported to `server/src/scoring.js` as the single source of truth for priority scores.

**Tech Stack:** Node.js, Express, better-sqlite3, bcrypt, jsonwebtoken, multer, exceljs, pdfkit, jest, supertest, React 18, Vite, react-router-dom.

Reference spec: `docs/superpowers/specs/2026-06-21-sibansos-rt-fullstack-design.md`

---

## Task 1: Backend project scaffolding

**Files:**
- Create: `server/package.json`
- Create: `server/.gitignore`
- Create: `server/jest.config.js`

- [ ] **Step 1: Create the backend directory and package.json**

```bash
mkdir -p "/home/usb/Desktop/tugas/FP DPPL/server/src/routes" "/home/usb/Desktop/tugas/FP DPPL/server/tests" "/home/usb/Desktop/tugas/FP DPPL/server/uploads"
```

`server/package.json`:
```json
{
  "name": "sibansos-rt-server",
  "version": "1.0.0",
  "type": "commonjs",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "better-sqlite3": "^11.3.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "exceljs": "^4.4.0",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "pdfkit": "^0.15.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.0.0"
  }
}
```

`server/jest.config.js`:
```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
};
```

`server/.gitignore`:
```
node_modules
*.sqlite
uploads/*
!uploads/.gitkeep
```

- [ ] **Step 2: Install dependencies**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL/server" && npm install
```

Expected: `node_modules` created, no errors.

- [ ] **Step 3: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && touch server/uploads/.gitkeep && git add server/package.json server/jest.config.js server/.gitignore server/uploads/.gitkeep && git commit -m "chore: scaffold backend project"
```

(If this directory is not yet a git repo, run `git init` first and commit everything at the end of Task 1 instead.)

---

## Task 2: SQLite schema and DB module

**Files:**
- Create: `server/src/db.js`
- Test: `server/tests/db.test.js`

- [ ] **Step 1: Write the failing test**

`server/tests/db.test.js`:
```js
const fs = require('fs');
const path = require('path');

const TEST_DB_PATH = path.join(__dirname, 'test-db.sqlite');

function freshDb() {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  process.env.DB_PATH = TEST_DB_PATH;
  delete require.cache[require.resolve('../src/db')];
  return require('../src/db');
}

afterAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

test('creates all expected tables', () => {
  const db = freshDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
  expect(tables).toEqual(
    expect.arrayContaining([
      'users', 'warga', 'foto_rumah', 'data_administratif',
      'bantuan', 'hasil_seleksi', 'notifications',
    ])
  );
});

test('seeds exactly one admin user', () => {
  const db = freshDb();
  const admins = db.prepare("SELECT * FROM users WHERE role = 'admin'").all();
  expect(admins.length).toBe(1);
  expect(admins[0].username).toBe('pengurus');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/db.test.js`
Expected: FAIL with "Cannot find module '../src/db'"

- [ ] **Step 3: Write the DB module**

`server/src/db.js`:
```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/db.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/db.js server/tests/db.test.js && git commit -m "feat: add SQLite schema and seeded admin user"
```

---

## Task 3: Scoring engine (ModelAI)

**Files:**
- Create: `server/src/scoring.js`
- Test: `server/tests/scoring.test.js`

This ports the deterministic formula from `app/data.js` (`faktorPrioritas`/`skorPrioritas`/`rekomendasiAI`) verbatim, since the design requires keeping the existing transparent rule-based engine.

- [ ] **Step 1: Write the failing test**

`server/tests/scoring.test.js`:
```js
const { hitungSkor, tingkatPrioritas, rekomendasiAI } = require('../src/scoring');

test('low income, high dependents, unlivable house scores high priority', () => {
  const skor = hitungSkor({
    pendapatan: 600000,
    tanggungan: 5,
    kondisiRumah: 'Tidak Layak',
    statusRumah: 'Menumpang',
    kategoriKerja: 'tidak_bekerja',
  });
  expect(skor).toBeGreaterThanOrEqual(70);
  expect(tingkatPrioritas(skor).label).toBe('Sangat Tinggi');
});

test('high income, low dependents, livable house scores low priority', () => {
  const skor = hitungSkor({
    pendapatan: 4200000,
    tanggungan: 2,
    kondisiRumah: 'Layak',
    statusRumah: 'Milik Sendiri',
    kategoriKerja: 'tetap',
  });
  expect(skor).toBeLessThan(40);
  expect(tingkatPrioritas(skor).label).toBe('Rendah');
});

test('rekomendasiAI returns a narrative mentioning the score', () => {
  const w = {
    pendapatan: 950000, tanggungan: 4,
    kondisiRumah: 'Tidak Layak', statusRumah: 'Menumpang', kategoriKerja: 'serabutan',
  };
  const r = rekomendasiAI(w);
  expect(r.teks).toContain(String(r.skor));
  expect(r.skor).toBe(hitungSkor(w));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/scoring.test.js`
Expected: FAIL with "Cannot find module '../src/scoring'"

- [ ] **Step 3: Write the scoring module**

`server/src/scoring.js`:
```js
// Weighted, deterministic priority score (total 100):
// income/capita 40 + dependents 20 + house condition 22 + ownership 10 + job stability 8
function faktorPrioritas(w) {
  const perKapita = w.pendapatan / (w.tanggungan + 1);
  let inc = (1.5e6 - perKapita) / (1.5e6 - 300000);
  inc = Math.max(0, Math.min(1, inc));
  const incomeScore = +(inc * 40).toFixed(1);

  const tanggunganScore = +(Math.min(w.tanggungan, 6) / 6 * 20).toFixed(1);

  const rumahMap = { 'Tidak Layak': 22, 'Kurang Layak': 13, 'Layak': 4 };
  const rumahScore = rumahMap[w.kondisiRumah] ?? 4;

  const statusMap = { 'Menumpang': 10, 'Kontrak': 7, 'Milik Sendiri': 3 };
  const statusScore = statusMap[w.statusRumah] ?? 3;

  const kerjaMap = { tidak_bekerja: 8, serabutan: 6, tetap: 2 };
  const kerjaScore = kerjaMap[w.kategoriKerja] ?? 4;

  return {
    perKapita,
    faktor: [
      { nama: 'Pendapatan per kapita', nilai: incomeScore, max: 40 },
      { nama: 'Jumlah tanggungan', nilai: tanggunganScore, max: 20 },
      { nama: 'Kondisi rumah', nilai: rumahScore, max: 22 },
      { nama: 'Status kepemilikan', nilai: statusScore, max: 10 },
      { nama: 'Stabilitas pekerjaan', nilai: kerjaScore, max: 8 },
    ],
  };
}

function hitungSkor(w) {
  const { faktor } = faktorPrioritas(w);
  return Math.round(faktor.reduce((s, f) => s + f.nilai, 0));
}

function tingkatPrioritas(skor) {
  if (skor >= 70) return { label: 'Sangat Tinggi', tone: 'red' };
  if (skor >= 55) return { label: 'Tinggi', tone: 'amber' };
  if (skor >= 40) return { label: 'Sedang', tone: 'blue' };
  return { label: 'Rendah', tone: 'gray' };
}

function rekomendasiAI(w) {
  const skor = hitungSkor(w);
  const t = tingkatPrioritas(skor);
  const { perKapita, faktor } = faktorPrioritas(w);
  const perKapitaTeks = 'Rp ' + Math.round(perKapita).toLocaleString('id-ID');
  const alasan = [];

  if (perKapita < 600000) alasan.push(`pendapatan per kapita ${perKapitaTeks}/bulan berada di bawah ambang kelayakan`);
  else alasan.push(`pendapatan per kapita ${perKapitaTeks}/bulan`);
  if (w.tanggungan >= 4) alasan.push(`menanggung ${w.tanggungan} jiwa`);
  if (w.kondisiRumah === 'Tidak Layak') alasan.push('kondisi rumah tidak layak huni');
  else if (w.kondisiRumah === 'Kurang Layak') alasan.push('kondisi rumah kurang layak');
  if (w.statusRumah === 'Menumpang') alasan.push('belum memiliki tempat tinggal sendiri');

  let saran;
  if (skor >= 70) saran = 'Direkomendasikan sebagai PENERIMA prioritas utama.';
  else if (skor >= 55) saran = 'Layak dipertimbangkan sebagai penerima bantuan.';
  else if (skor >= 40) saran = 'Dapat dimasukkan ke daftar cadangan bila kuota tersedia.';
  else saran = 'Belum memenuhi ambang prioritas untuk periode ini.';

  return {
    skor, tingkat: t, faktor,
    teks: `Berdasarkan analisis data, warga ini memiliki skor prioritas ${skor}/100 (kategori ${t.label}). Pertimbangan utama: ${alasan.join(', ')}. ${saran}`,
  };
}

module.exports = { faktorPrioritas, hitungSkor, tingkatPrioritas, rekomendasiAI };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/scoring.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/scoring.js server/tests/scoring.test.js && git commit -m "feat: port priority scoring engine to backend"
```

---

## Task 4: Auth helpers and middleware

**Files:**
- Create: `server/src/auth.js`
- Test: `server/tests/auth.test.js`

- [ ] **Step 1: Write the failing test**

`server/tests/auth.test.js`:
```js
process.env.JWT_SECRET = 'test-secret';
const { signToken, verifyToken, requireAuth, requireRole } = require('../src/auth');

test('signToken/verifyToken round-trip preserves payload', () => {
  const token = signToken({ id: 1, role: 'admin' });
  const decoded = verifyToken(token);
  expect(decoded.id).toBe(1);
  expect(decoded.role).toBe('admin');
});

test('requireAuth rejects requests with no cookie', () => {
  const req = { cookies: {} };
  const res = { status: jest.fn(() => res), json: jest.fn() };
  const next = jest.fn();
  requireAuth(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test('requireAuth attaches user and calls next on valid cookie', () => {
  const token = signToken({ id: 2, role: 'warga' });
  const req = { cookies: { token } };
  const res = { status: jest.fn(() => res), json: jest.fn() };
  const next = jest.fn();
  requireAuth(req, res, next);
  expect(next).toHaveBeenCalled();
  expect(req.user.id).toBe(2);
});

test('requireRole(admin) blocks a warga user', () => {
  const req = { user: { id: 2, role: 'warga' } };
  const res = { status: jest.fn(() => res), json: jest.fn() };
  const next = jest.fn();
  requireRole('admin')(req, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/auth.test.js`
Expected: FAIL with "Cannot find module '../src/auth'"

- [ ] **Step 3: Write the auth module**

`server/src/auth.js`:
```js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = verifyToken(token);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { signToken, verifyToken, requireAuth, requireRole, JWT_SECRET };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/auth.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/auth.js server/tests/auth.test.js && git commit -m "feat: add JWT auth helpers and role middleware"
```

---

## Task 5: Express app skeleton

**Files:**
- Create: `server/src/app.js`
- Create: `server/src/index.js`
- Test: `server/tests/health.test.js`

- [ ] **Step 1: Write the failing test**

`server/tests/health.test.js`:
```js
const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-health.sqlite');
const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');

afterAll(() => {
  const p = process.env.DB_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/health.test.js`
Expected: FAIL with "Cannot find module '../src/app'"

- [ ] **Step 3: Write the app skeleton**

`server/src/app.js`:
```js
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/warga', require('./routes/warga'));
app.use('/api/admin', require('./routes/admin'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
```

`server/src/index.js`:
```js
const app = require('./app');
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SIBANSOS RT API listening on :${PORT}`));
```

Create placeholder-free empty routers so `app.js` can `require` them before Tasks 6-12 fill them in:

`server/src/routes/auth.js`:
```js
const express = require('express');
const router = express.Router();
module.exports = router;
```

`server/src/routes/warga.js`:
```js
const express = require('express');
const router = express.Router();
module.exports = router;
```

`server/src/routes/admin.js`:
```js
const express = require('express');
const router = express.Router();
module.exports = router;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/health.test.js`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/app.js server/src/index.js server/src/routes server/tests/health.test.js && git commit -m "feat: add Express app skeleton with health check"
```

---

## Task 6: Auth routes — register, login, logout, me

**Files:**
- Modify: `server/src/routes/auth.js`
- Test: `server/tests/auth-routes.test.js`

- [ ] **Step 1: Write the failing test**

`server/tests/auth-routes.test.js`:
```js
const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-auth-routes.sqlite');
process.env.JWT_SECRET = 'test-secret';
const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');

afterAll(() => {
  const p = process.env.DB_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

test('warga can register, then login, then fetch /me', async () => {
  const agent = request.agent(app);

  const reg = await agent.post('/api/auth/register').send({
    nama: 'Sumarni Wijaya', nik: '3578014501780099', password: 'rahasia123',
  });
  expect(reg.status).toBe(201);

  const login = await agent.post('/api/auth/login').send({
    nik: '3578014501780099', password: 'rahasia123',
  });
  expect(login.status).toBe(200);
  expect(login.body.role).toBe('warga');

  const me = await agent.get('/api/auth/me');
  expect(me.status).toBe(200);
  expect(me.body.role).toBe('warga');
  expect(me.body.nama).toBe('Sumarni Wijaya');
});

test('registering with a duplicate NIK fails with 400', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ nama: 'A', nik: '111', password: 'password1' });
  const dup = await agent.post('/api/auth/register').send({ nama: 'B', nik: '111', password: 'password2' });
  expect(dup.status).toBe(400);
});

test('admin can login with seeded credentials', async () => {
  const agent = request.agent(app);
  const login = await agent.post('/api/auth/login').send({ nik: 'pengurus', password: 'pengurus123' });
  expect(login.status).toBe(200);
  expect(login.body.role).toBe('admin');
});

test('logout clears the session', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ nik: 'pengurus', password: 'pengurus123' });
  await agent.post('/api/auth/logout');
  const me = await agent.get('/api/auth/me');
  expect(me.status).toBe(401);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/auth-routes.test.js`
Expected: FAIL (404s, since `auth.js` router is empty)

- [ ] **Step 3: Implement the auth routes**

`server/src/routes/auth.js`:
```js
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { signToken, requireAuth } = require('../auth');

const router = express.Router();

const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 };

router.post('/register', (req, res) => {
  const { nama, nik, no_kk, password } = req.body;
  if (!nama || !nik || !password || password.length < 6) {
    return res.status(400).json({ error: 'nama, nik, and password (min 6 chars) are required' });
  }
  const existing = db.prepare('SELECT 1 FROM warga WHERE nik = ?').get(nik);
  if (existing) return res.status(400).json({ error: 'NIK sudah terdaftar' });

  const insertWarga = db.prepare(
    'INSERT INTO warga (nama, nik, no_kk) VALUES (?, ?, ?)'
  );
  const { lastInsertRowid: wargaId } = insertWarga.run(nama, nik, no_kk || null);

  db.prepare(
    'INSERT INTO data_administratif (warga_id) VALUES (?)'
  ).run(wargaId);

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (role, username, password_hash, warga_id) VALUES (?, ?, ?, ?)'
  ).run('warga', nik, hash, wargaId);

  res.status(201).json({ id: wargaId, nama, nik });
});

router.post('/login', (req, res) => {
  const { nik, password } = req.body;
  if (!nik || !password) return res.status(400).json({ error: 'nik and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(nik);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'NIK/username atau password salah' });
  }

  const token = signToken({ id: user.id, role: user.role, wargaId: user.warga_id });
  res.cookie('token', token, COOKIE_OPTS);
  res.json({ role: user.role });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTS);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  if (req.user.role === 'admin') {
    return res.json({ role: 'admin', username: 'pengurus' });
  }
  const warga = db.prepare('SELECT id, nama, nik FROM warga WHERE id = ?').get(req.user.wargaId);
  res.json({ role: 'warga', ...warga });
});

module.exports = router;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/auth-routes.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/routes/auth.js server/tests/auth-routes.test.js && git commit -m "feat: implement warga registration and login for both roles"
```

---

## Task 7: Warga routes — UC06, UC07, UC08, UC09

**Files:**
- Modify: `server/src/routes/warga.js`
- Test: `server/tests/warga-routes.test.js`

- [ ] **Step 1: Write the failing test**

`server/tests/warga-routes.test.js`:
```js
const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-warga-routes.sqlite');
process.env.JWT_SECRET = 'test-secret';
const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');

afterAll(() => {
  const p = process.env.DB_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
  const uploadDir = path.join(__dirname, '..', 'uploads');
  fs.readdirSync(uploadDir).forEach((f) => {
    if (f.startsWith('test-')) fs.unlinkSync(path.join(uploadDir, f));
  });
});

async function registerAndLogin(agent, nik) {
  await agent.post('/api/auth/register').send({ nama: 'Aminah Lestari', nik, password: 'password1' });
  await agent.post('/api/auth/login').send({ nik, password: 'password1' });
}

test('UC06: warga can submit data administratif, which computes a priority score', async () => {
  const agent = request.agent(app);
  await registerAndLogin(agent, '111111');

  const res = await agent.put('/api/warga/me/data-administratif').send({
    kategori_kerja: 'tidak_bekerja', pekerjaan: 'Tidak Bekerja', pendapatan: 600000,
    tanggungan: 5, status_rumah: 'Menumpang', kondisi_rumah: 'Tidak Layak',
  });
  expect(res.status).toBe(200);
  expect(res.body.skor_prioritas).toBeGreaterThanOrEqual(70);
  expect(res.body.validitas).toBe('menunggu');
});

test('UC09: updating profile resets validitas back to menunggu', async () => {
  const agent = request.agent(app);
  await registerAndLogin(agent, '222222');
  await agent.put('/api/warga/me/data-administratif').send({
    kategori_kerja: 'tetap', pekerjaan: 'PNS', pendapatan: 5000000,
    tanggungan: 1, status_rumah: 'Milik Sendiri', kondisi_rumah: 'Layak',
  });

  const db = require('../src/db');
  const profile = db.prepare('SELECT id FROM warga WHERE nik = ?').get('222222');
  db.prepare("UPDATE data_administratif SET validitas = 'valid' WHERE warga_id = ?").run(profile.id);

  const res = await agent.put('/api/warga/me/profile').send({ alamat: 'Jl. Baru No. 1', no_telepon: '0800' });
  expect(res.status).toBe(200);

  const after = db.prepare('SELECT validitas FROM data_administratif WHERE warga_id = ?').get(profile.id);
  expect(after.validitas).toBe('menunggu');
});

test('UC07: warga can upload a house-condition photo', async () => {
  const agent = request.agent(app);
  await registerAndLogin(agent, '333333');

  const res = await agent
    .post('/api/warga/me/foto')
    .field('jenis', 'eksterior')
    .field('deskripsi', 'Tampak depan rumah')
    .attach('foto', Buffer.from('fake-image-bytes'), 'test-rumah.jpg');

  expect(res.status).toBe(201);
  expect(res.body.jenis).toBe('eksterior');
});

test('UC07: rejects an unsupported jenis value', async () => {
  const agent = request.agent(app);
  await registerAndLogin(agent, '444444');
  const res = await agent
    .post('/api/warga/me/foto')
    .field('jenis', 'bukan_valid')
    .attach('foto', Buffer.from('fake-image-bytes'), 'test-rumah2.jpg');
  expect(res.status).toBe(400);
});

test('UC08: warga sees menunggu status before any seleksi exists', async () => {
  const agent = request.agent(app);
  await registerAndLogin(agent, '555555');
  const res = await agent.get('/api/warga/me/status');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('belum_diseleksi');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/warga-routes.test.js`
Expected: FAIL (404s, router is empty)

- [ ] **Step 3: Implement the warga routes**

`server/src/routes/warga.js`:
```js
const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { hitungSkor } = require('../scoring');

const router = express.Router();
router.use(requireAuth, requireRole('warga'));

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'uploads'),
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function getWargaId(req) {
  return req.user.wargaId;
}

router.get('/me/profile', (req, res) => {
  const warga = db.prepare('SELECT * FROM warga WHERE id = ?').get(getWargaId(req));
  const admin = db.prepare('SELECT * FROM data_administratif WHERE warga_id = ?').get(getWargaId(req));
  res.json({ ...warga, data_administratif: admin });
});

router.put('/me/profile', (req, res) => {
  const { alamat, no_telepon } = req.body;
  db.prepare('UPDATE warga SET alamat = ?, no_telepon = ? WHERE id = ?')
    .run(alamat || null, no_telepon || null, getWargaId(req));
  db.prepare("UPDATE data_administratif SET validitas = 'menunggu', updated_at = datetime('now') WHERE warga_id = ?")
    .run(getWargaId(req));
  res.json({ ok: true });
});

router.put('/me/data-administratif', (req, res) => {
  const { kategori_kerja, pekerjaan, pendapatan, tanggungan, status_rumah, kondisi_rumah } = req.body;
  const valid = ['tetap', 'serabutan', 'tidak_bekerja'].includes(kategori_kerja)
    && ['Milik Sendiri', 'Kontrak', 'Menumpang'].includes(status_rumah)
    && ['Layak', 'Kurang Layak', 'Tidak Layak'].includes(kondisi_rumah)
    && Number.isFinite(Number(pendapatan)) && Number(pendapatan) >= 0
    && Number.isInteger(Number(tanggungan)) && Number(tanggungan) >= 0;
  if (!valid) return res.status(400).json({ error: 'Data administratif tidak lengkap atau tidak valid' });

  const skor = hitungSkor({
    pendapatan: Number(pendapatan), tanggungan: Number(tanggungan), kondisiRumah: kondisi_rumah,
    statusRumah: status_rumah, kategoriKerja: kategori_kerja,
  });

  db.prepare(`
    UPDATE data_administratif SET
      kategori_kerja = ?, pekerjaan = ?, pendapatan = ?, tanggungan = ?,
      status_rumah = ?, kondisi_rumah = ?, skor_prioritas = ?,
      validitas = 'menunggu', updated_at = datetime('now')
    WHERE warga_id = ?
  `).run(kategori_kerja, pekerjaan || null, Number(pendapatan), Number(tanggungan),
    status_rumah, kondisi_rumah, skor, getWargaId(req));

  const updated = db.prepare('SELECT * FROM data_administratif WHERE warga_id = ?').get(getWargaId(req));
  res.json(updated);
});

router.post('/me/foto', upload.single('foto'), (req, res) => {
  const { jenis, deskripsi } = req.body;
  if (!['eksterior', 'interior', 'lingkungan'].includes(jenis)) {
    return res.status(400).json({ error: 'jenis harus salah satu dari eksterior, interior, lingkungan' });
  }
  if (!req.file) return res.status(400).json({ error: 'File foto wajib diunggah' });

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO foto_rumah (warga_id, jenis, file_path, deskripsi) VALUES (?, ?, ?, ?)'
  ).run(getWargaId(req), jenis, req.file.filename, deskripsi || null);

  db.prepare(`
    UPDATE data_administratif SET chk_foto = 1, updated_at = datetime('now') WHERE warga_id = ?
  `).run(getWargaId(req));

  res.status(201).json({ id: lastInsertRowid, jenis, file_path: req.file.filename });
});

router.get('/me/status', (req, res) => {
  const active = db.prepare('SELECT * FROM bantuan WHERE is_active = 1').get();
  if (!active) return res.json({ status: 'belum_diseleksi' });

  const hasil = db.prepare(
    'SELECT * FROM hasil_seleksi WHERE warga_id = ? AND bantuan_id = ?'
  ).get(getWargaId(req), active.id);

  if (!hasil) return res.json({ status: 'belum_diseleksi', bantuan: active });
  res.json({ ...hasil, bantuan: active });
});

router.get('/me/notifications', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM notifications WHERE warga_id = ? ORDER BY created_at DESC'
  ).all(getWargaId(req));
  res.json(rows);
});

module.exports = router;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/warga-routes.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/routes/warga.js server/tests/warga-routes.test.js && git commit -m "feat: implement warga-facing routes (UC06-UC09)"
```

---

## Task 8: Admin routes — UC01 kuota/periode

**Files:**
- Modify: `server/src/routes/admin.js`
- Test: `server/tests/admin-bantuan.test.js`

From here on, every admin route in `server/src/routes/admin.js` shares one router-level guard. Each task appends more routes to the same file — keep the existing `router.use(...)` line and the final `module.exports = router;` line at the bottom as you add routes.

- [ ] **Step 1: Write the failing test**

`server/tests/admin-bantuan.test.js`:
```js
const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-admin-bantuan.sqlite');
process.env.JWT_SECRET = 'test-secret';
const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');

afterAll(() => {
  const p = process.env.DB_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

async function loginAdmin(agent) {
  await agent.post('/api/auth/login').send({ nik: 'pengurus', password: 'pengurus123' });
}

test('UC01: admin opens a new periode, deactivating the previous one', async () => {
  const agent = request.agent(app);
  await loginAdmin(agent);

  const first = await agent.post('/api/admin/bantuan').send({
    nama_bantuan: 'BST', jenis_bantuan: 'tunai', kuota: 5, nominal: 600000, periode: 'Q1 2026',
  });
  expect(first.status).toBe(201);

  const second = await agent.post('/api/admin/bantuan').send({
    nama_bantuan: 'BST', jenis_bantuan: 'tunai', kuota: 6, nominal: 600000, periode: 'Q2 2026',
  });
  expect(second.status).toBe(201);

  const active = await agent.get('/api/admin/bantuan/active');
  expect(active.body.periode).toBe('Q2 2026');
  expect(active.body.kuota).toBe(6);

  const db = require('../src/db');
  const firstRow = db.prepare('SELECT is_active FROM bantuan WHERE periode = ?').get('Q1 2026');
  expect(firstRow.is_active).toBe(0);
});

test('UC01: rejects a kuota of zero or less', async () => {
  const agent = request.agent(app);
  await loginAdmin(agent);
  const res = await agent.post('/api/admin/bantuan').send({
    nama_bantuan: 'BST', kuota: 0, periode: 'Q3 2026',
  });
  expect(res.status).toBe(400);
});

test('non-admin cannot open a periode', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ nama: 'X', nik: '999', password: 'password1' });
  await agent.post('/api/auth/login').send({ nik: '999', password: 'password1' });
  const res = await agent.post('/api/admin/bantuan').send({ nama_bantuan: 'BST', kuota: 5, periode: 'Q1 2026' });
  expect(res.status).toBe(403);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/admin-bantuan.test.js`
Expected: FAIL (404s, router is empty)

- [ ] **Step 3: Implement the bantuan routes**

`server/src/routes/admin.js`:
```js
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { hitungSkor } = require('../scoring');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.post('/bantuan', (req, res) => {
  const { nama_bantuan, jenis_bantuan, kuota, nominal, periode } = req.body;
  if (!nama_bantuan || !periode || !Number.isInteger(Number(kuota)) || Number(kuota) <= 0) {
    return res.status(400).json({ error: 'nama_bantuan, periode, and a positive integer kuota are required' });
  }

  db.prepare('UPDATE bantuan SET is_active = 0 WHERE is_active = 1').run();
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO bantuan (nama_bantuan, jenis_bantuan, kuota, nominal, periode, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(nama_bantuan, jenis_bantuan || null, Number(kuota), nominal ? Number(nominal) : null, periode);

  const row = db.prepare('SELECT * FROM bantuan WHERE id = ?').get(lastInsertRowid);
  res.status(201).json(row);
});

router.get('/bantuan/active', (req, res) => {
  const row = db.prepare('SELECT * FROM bantuan WHERE is_active = 1').get();
  if (!row) return res.status(404).json({ error: 'Belum ada periode bantuan aktif' });
  res.json(row);
});

module.exports = router;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/admin-bantuan.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/routes/admin.js server/tests/admin-bantuan.test.js && git commit -m "feat: implement UC01 kuota/periode management"
```

---

## Task 9: Admin routes — UC02 verifikasi, UC05 ubah data, skor preview

**Files:**
- Modify: `server/src/routes/admin.js` (insert before the final `module.exports = router;` line)
- Test: `server/tests/admin-warga.test.js`

- [ ] **Step 1: Write the failing test**

`server/tests/admin-warga.test.js`:
```js
const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-admin-warga.sqlite');
process.env.JWT_SECRET = 'test-secret';
const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

afterAll(() => {
  const p = process.env.DB_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

async function loginAdmin(agent) {
  await agent.post('/api/auth/login').send({ nik: 'pengurus', password: 'pengurus123' });
}

async function seedWarga(nik) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ nama: 'Bambang Setiawan', nik, password: 'password1' });
  await agent.post('/api/auth/login').send({ nik, password: 'password1' });
  await agent.put('/api/warga/me/data-administratif').send({
    kategori_kerja: 'serabutan', pekerjaan: 'Tukang Bangunan', pendapatan: 1600000,
    tanggungan: 3, status_rumah: 'Kontrak', kondisi_rumah: 'Kurang Layak',
  });
  return db.prepare('SELECT id FROM warga WHERE nik = ?').get(nik).id;
}

test('UC02: admin lists warga and filters by validitas', async () => {
  await seedWarga('aaa');
  const agent = request.agent(app);
  await loginAdmin(agent);

  const all = await agent.get('/api/admin/warga');
  expect(all.body.length).toBeGreaterThanOrEqual(1);

  const menunggu = await agent.get('/api/admin/warga?validitas=menunggu');
  expect(menunggu.body.every((w) => w.validitas === 'menunggu')).toBe(true);

  const search = await agent.get('/api/admin/warga?search=Bambang');
  expect(search.body.some((w) => w.nama === 'Bambang Setiawan')).toBe(true);
});

test('UC02: admin sets validitas with checklist and catatan', async () => {
  const wargaId = await seedWarga('bbb');
  const agent = request.agent(app);
  await loginAdmin(agent);

  const res = await agent.put(`/api/admin/warga/${wargaId}/validitas`).send({
    validitas: 'valid', catatan_verifikasi: 'Data lengkap', chk_ktp: true, chk_kk: true,
    chk_pendapatan: true, chk_foto: true,
  });
  expect(res.status).toBe(200);
  expect(res.body.validitas).toBe('valid');
});

test('UC05: admin edits warga data, which recomputes score and resets validitas', async () => {
  const wargaId = await seedWarga('ccc');
  const agent = request.agent(app);
  await loginAdmin(agent);
  await agent.put(`/api/admin/warga/${wargaId}/validitas`).send({ validitas: 'valid', chk_ktp: true, chk_kk: true, chk_pendapatan: true, chk_foto: true });

  const res = await agent.put(`/api/admin/warga/${wargaId}`).send({
    kategori_kerja: 'tidak_bekerja', pekerjaan: 'Tidak Bekerja', pendapatan: 600000,
    tanggungan: 5, status_rumah: 'Menumpang', kondisi_rumah: 'Tidak Layak',
  });
  expect(res.status).toBe(200);
  expect(res.body.validitas).toBe('menunggu');
  expect(res.body.skor_prioritas).toBeGreaterThanOrEqual(70);
});

test('skor-preview computes a score without persisting anything', async () => {
  const agent = request.agent(app);
  await loginAdmin(agent);
  const res = await agent.post('/api/admin/skor-preview').send({
    pendapatan: 600000, tanggungan: 5, kondisiRumah: 'Tidak Layak',
    statusRumah: 'Menumpang', kategoriKerja: 'tidak_bekerja',
  });
  expect(res.status).toBe(200);
  expect(res.body.skor).toBeGreaterThanOrEqual(70);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/admin-warga.test.js`
Expected: FAIL (404s for the new endpoints)

- [ ] **Step 3: Add the warga management routes**

Insert into `server/src/routes/admin.js`, directly above `module.exports = router;`:
```js
function rowToWarga(row) {
  return {
    id: row.id, nama: row.nama, nik: row.nik, no_kk: row.no_kk,
    alamat: row.alamat, no_telepon: row.no_telepon,
    kategori_kerja: row.kategori_kerja, pekerjaan: row.pekerjaan,
    pendapatan: row.pendapatan, tanggungan: row.tanggungan,
    status_rumah: row.status_rumah, kondisi_rumah: row.kondisi_rumah,
    skor_prioritas: row.skor_prioritas, validitas: row.validitas,
    catatan_verifikasi: row.catatan_verifikasi,
    chk_ktp: !!row.chk_ktp, chk_kk: !!row.chk_kk,
    chk_pendapatan: !!row.chk_pendapatan, chk_foto: !!row.chk_foto,
  };
}

const WARGA_JOIN_SELECT = `
  SELECT w.*, d.kategori_kerja, d.pekerjaan, d.pendapatan, d.tanggungan,
         d.status_rumah, d.kondisi_rumah, d.skor_prioritas, d.validitas,
         d.catatan_verifikasi, d.chk_ktp, d.chk_kk, d.chk_pendapatan, d.chk_foto
  FROM warga w JOIN data_administratif d ON d.warga_id = w.id
`;

router.get('/warga', (req, res) => {
  const { validitas, search } = req.query;
  let sql = WARGA_JOIN_SELECT + ' WHERE 1=1';
  const params = [];
  if (validitas) { sql += ' AND d.validitas = ?'; params.push(validitas); }
  if (search) { sql += ' AND (w.nama LIKE ? OR w.nik LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(rowToWarga));
});

router.get('/warga/:id', (req, res) => {
  const row = db.prepare(WARGA_JOIN_SELECT + ' WHERE w.id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Warga tidak ditemukan' });
  const foto = db.prepare('SELECT * FROM foto_rumah WHERE warga_id = ?').all(req.params.id);
  res.json({ ...rowToWarga(row), foto });
});

router.put('/warga/:id/validitas', (req, res) => {
  const { validitas, catatan_verifikasi, chk_ktp, chk_kk, chk_pendapatan, chk_foto } = req.body;
  if (!['valid', 'menunggu', 'perlu_perbaikan', 'tidak_valid'].includes(validitas)) {
    return res.status(400).json({ error: 'validitas tidak dikenal' });
  }
  db.prepare(`
    UPDATE data_administratif SET
      validitas = ?, catatan_verifikasi = ?,
      chk_ktp = ?, chk_kk = ?, chk_pendapatan = ?, chk_foto = ?,
      updated_at = datetime('now')
    WHERE warga_id = ?
  `).run(validitas, catatan_verifikasi || null,
    chk_ktp ? 1 : 0, chk_kk ? 1 : 0, chk_pendapatan ? 1 : 0, chk_foto ? 1 : 0,
    req.params.id);

  const row = db.prepare(WARGA_JOIN_SELECT + ' WHERE w.id = ?').get(req.params.id);
  res.json(rowToWarga(row));
});

router.put('/warga/:id', (req, res) => {
  const { nama, alamat, no_telepon, kategori_kerja, pekerjaan, pendapatan, tanggungan, status_rumah, kondisi_rumah } = req.body;
  const valid = ['tetap', 'serabutan', 'tidak_bekerja'].includes(kategori_kerja)
    && ['Milik Sendiri', 'Kontrak', 'Menumpang'].includes(status_rumah)
    && ['Layak', 'Kurang Layak', 'Tidak Layak'].includes(kondisi_rumah)
    && Number.isFinite(Number(pendapatan)) && Number(pendapatan) >= 0
    && Number.isInteger(Number(tanggungan)) && Number(tanggungan) >= 0;
  if (!valid) return res.status(400).json({ error: 'Data warga tidak lengkap atau tidak valid' });

  const skor = hitungSkor({
    pendapatan: Number(pendapatan), tanggungan: Number(tanggungan), kondisiRumah: kondisi_rumah,
    statusRumah: status_rumah, kategoriKerja: kategori_kerja,
  });

  if (nama || alamat || no_telepon) {
    db.prepare('UPDATE warga SET nama = COALESCE(?, nama), alamat = COALESCE(?, alamat), no_telepon = COALESCE(?, no_telepon) WHERE id = ?')
      .run(nama || null, alamat || null, no_telepon || null, req.params.id);
  }

  db.prepare(`
    UPDATE data_administratif SET
      kategori_kerja = ?, pekerjaan = ?, pendapatan = ?, tanggungan = ?,
      status_rumah = ?, kondisi_rumah = ?, skor_prioritas = ?,
      validitas = 'menunggu', updated_at = datetime('now')
    WHERE warga_id = ?
  `).run(kategori_kerja, pekerjaan || null, Number(pendapatan), Number(tanggungan),
    status_rumah, kondisi_rumah, skor, req.params.id);

  const row = db.prepare(WARGA_JOIN_SELECT + ' WHERE w.id = ?').get(req.params.id);
  res.json(rowToWarga(row));
});

router.post('/skor-preview', (req, res) => {
  const { pendapatan, tanggungan, kondisiRumah, statusRumah, kategoriKerja } = req.body;
  const skor = hitungSkor({
    pendapatan: Number(pendapatan) || 0, tanggungan: Number(tanggungan) || 0,
    kondisiRumah, statusRumah, kategoriKerja,
  });
  res.json({ skor });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/admin-warga.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/routes/admin.js server/tests/admin-warga.test.js && git commit -m "feat: implement UC02 verifikasi and UC05 ubah data warga"
```

---

## Task 10: Admin routes — UC10 seleksi status + notifications

**Files:**
- Modify: `server/src/routes/admin.js` (insert before the final `module.exports = router;` line)
- Test: `server/tests/admin-seleksi.test.js`

`GET /seleksi` lazily creates a `hasil_seleksi` row (status `menunggu`, current score) for every warga against the active periode the first time it's listed, then returns all rows for that periode ranked by score. This keeps `hasil_seleksi` as the single source of truth for both the live ranking table and (once a periode closes) the riwayat in Task 11.

- [ ] **Step 1: Write the failing test**

`server/tests/admin-seleksi.test.js`:
```js
const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-admin-seleksi.sqlite');
process.env.JWT_SECRET = 'test-secret';
const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

afterAll(() => {
  const p = process.env.DB_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

async function loginAdmin(agent) {
  await agent.post('/api/auth/login').send({ nik: 'pengurus', password: 'pengurus123' });
}

async function seedWarga(nik, pendapatan, tanggungan) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ nama: `Warga ${nik}`, nik, password: 'password1' });
  await agent.post('/api/auth/login').send({ nik, password: 'password1' });
  await agent.put('/api/warga/me/data-administratif').send({
    kategori_kerja: 'serabutan', pekerjaan: 'Buruh', pendapatan, tanggungan,
    status_rumah: 'Kontrak', kondisi_rumah: 'Kurang Layak',
  });
}

test('UC10: seleksi list is ranked by score descending and statuses are updatable', async () => {
  await seedWarga('p1', 600000, 5);
  await seedWarga('p2', 4000000, 1);

  const agent = request.agent(app);
  await loginAdmin(agent);
  await agent.post('/api/admin/bantuan').send({ nama_bantuan: 'BST', kuota: 1, periode: 'Q1 2026' });

  const list = await agent.get('/api/admin/seleksi');
  expect(list.status).toBe(200);
  expect(list.body.length).toBe(2);
  expect(list.body[0].skor_prioritas).toBeGreaterThanOrEqual(list.body[1].skor_prioritas);

  const top = list.body[0];
  const update = await agent.put(`/api/admin/seleksi/${top.id}`).send({
    status: 'penerima', catatan: 'Memenuhi kriteria prioritas',
  });
  expect(update.status).toBe(200);
  expect(update.body.status).toBe('penerima');

  const notif = db.prepare('SELECT * FROM notifications WHERE warga_id = ?').all(top.warga_id);
  expect(notif.length).toBe(1);
  expect(notif[0].message).toMatch(/penerima/i);
});

test('UC10: rejects an unknown status value', async () => {
  await seedWarga('p3', 1000000, 2);
  const agent = request.agent(app);
  await loginAdmin(agent);
  await agent.post('/api/admin/bantuan').send({ nama_bantuan: 'BST', kuota: 5, periode: 'Q2 2026' });
  const list = await agent.get('/api/admin/seleksi');
  const res = await agent.put(`/api/admin/seleksi/${list.body[0].id}`).send({ status: 'tidak_valid_status' });
  expect(res.status).toBe(400);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/admin-seleksi.test.js`
Expected: FAIL (404s for `/seleksi`)

- [ ] **Step 3: Add the seleksi routes**

Insert into `server/src/routes/admin.js`, directly above `module.exports = router;`:
```js
const SELEKSI_NOTIF_MESSAGE = {
  penerima: 'Selamat, Anda ditetapkan sebagai PENERIMA bantuan periode ini.',
  cadangan: 'Anda masuk dalam DAFTAR CADANGAN penerima bantuan periode ini.',
  bukan: 'Anda belum ditetapkan sebagai penerima bantuan pada periode ini.',
  menunggu: 'Status penerimaan bantuan Anda sedang ditinjau ulang.',
};

router.get('/seleksi', (req, res) => {
  const active = db.prepare('SELECT * FROM bantuan WHERE is_active = 1').get();
  if (!active) return res.status(404).json({ error: 'Belum ada periode bantuan aktif' });

  const allWarga = db.prepare('SELECT w.id, d.skor_prioritas FROM warga w JOIN data_administratif d ON d.warga_id = w.id').all();
  const insertIfMissing = db.prepare(`
    INSERT INTO hasil_seleksi (warga_id, bantuan_id, skor_prioritas, status)
    SELECT ?, ?, ?, 'menunggu'
    WHERE NOT EXISTS (SELECT 1 FROM hasil_seleksi WHERE warga_id = ? AND bantuan_id = ?)
  `);
  for (const w of allWarga) {
    insertIfMissing.run(w.id, active.id, w.skor_prioritas, w.id, active.id);
  }

  const rows = db.prepare(`
    SELECT hs.*, w.nama, w.nik, d.validitas
    FROM hasil_seleksi hs
    JOIN warga w ON w.id = hs.warga_id
    JOIN data_administratif d ON d.warga_id = hs.warga_id
    WHERE hs.bantuan_id = ?
    ORDER BY hs.skor_prioritas DESC
  `).all(active.id);

  res.json(rows);
});

router.put('/seleksi/:id', (req, res) => {
  const { status, catatan } = req.body;
  if (!['menunggu', 'penerima', 'cadangan', 'bukan'].includes(status)) {
    return res.status(400).json({ error: 'status tidak dikenal' });
  }
  const hasil = db.prepare('SELECT * FROM hasil_seleksi WHERE id = ?').get(req.params.id);
  if (!hasil) return res.status(404).json({ error: 'Data seleksi tidak ditemukan' });

  db.prepare('UPDATE hasil_seleksi SET status = ?, catatan = ? WHERE id = ?')
    .run(status, catatan || null, req.params.id);

  db.prepare('INSERT INTO notifications (warga_id, message) VALUES (?, ?)')
    .run(hasil.warga_id, SELEKSI_NOTIF_MESSAGE[status]);

  const updated = db.prepare('SELECT * FROM hasil_seleksi WHERE id = ?').get(req.params.id);
  res.json(updated);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/admin-seleksi.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/routes/admin.js server/tests/admin-seleksi.test.js && git commit -m "feat: implement UC10 seleksi status updates with notifications"
```

---

## Task 11: Admin routes — UC04 riwayat hasil seleksi

**Files:**
- Modify: `server/src/routes/admin.js` (insert before the final `module.exports = router;` line)
- Test: `server/tests/admin-riwayat.test.js`

- [ ] **Step 1: Write the failing test**

`server/tests/admin-riwayat.test.js`:
```js
const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-admin-riwayat.sqlite');
process.env.JWT_SECRET = 'test-secret';
const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');

afterAll(() => {
  const p = process.env.DB_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

async function loginAdmin(agent) {
  await agent.post('/api/auth/login').send({ nik: 'pengurus', password: 'pengurus123' });
}

async function seedWarga(nik) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ nama: `Warga ${nik}`, nik, password: 'password1' });
  await agent.post('/api/auth/login').send({ nik, password: 'password1' });
  await agent.put('/api/warga/me/data-administratif').send({
    kategori_kerja: 'serabutan', pekerjaan: 'Buruh', pendapatan: 1000000, tanggungan: 3,
    status_rumah: 'Kontrak', kondisi_rumah: 'Kurang Layak',
  });
}

test('UC04: past periode shows up in riwayat once a newer periode opens', async () => {
  await seedWarga('r1');
  const agent = request.agent(app);
  await loginAdmin(agent);

  await agent.post('/api/admin/bantuan').send({ nama_bantuan: 'BST', kuota: 5, periode: 'Q1 2026' });
  await agent.get('/api/admin/seleksi'); // materializes hasil_seleksi rows for Q1
  await agent.post('/api/admin/bantuan').send({ nama_bantuan: 'BST', kuota: 5, periode: 'Q2 2026' });

  const riwayat = await agent.get('/api/admin/riwayat');
  expect(riwayat.status).toBe(200);
  expect(riwayat.body.some((r) => r.periode === 'Q1 2026')).toBe(true);
  expect(riwayat.body.some((r) => r.periode === 'Q2 2026')).toBe(false); // active periode isn't "history" yet

  const filtered = await agent.get('/api/admin/riwayat?periode=Q1 2026');
  expect(filtered.body.every((r) => r.periode === 'Q1 2026')).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/admin-riwayat.test.js`
Expected: FAIL (404 for `/riwayat`)

- [ ] **Step 3: Add the riwayat route**

Insert into `server/src/routes/admin.js`, directly above `module.exports = router;`:
```js
router.get('/riwayat', (req, res) => {
  const { periode } = req.query;
  let sql = `
    SELECT hs.*, w.nama, w.nik, b.periode, b.nama_bantuan
    FROM hasil_seleksi hs
    JOIN warga w ON w.id = hs.warga_id
    JOIN bantuan b ON b.id = hs.bantuan_id
    WHERE b.is_active = 0
  `;
  const params = [];
  if (periode) { sql += ' AND b.periode = ?'; params.push(periode); }
  sql += ' ORDER BY b.created_at DESC, hs.skor_prioritas DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/riwayat/:id', (req, res) => {
  const row = db.prepare(`
    SELECT hs.*, w.nama, w.nik, b.periode, b.nama_bantuan
    FROM hasil_seleksi hs
    JOIN warga w ON w.id = hs.warga_id
    JOIN bantuan b ON b.id = hs.bantuan_id
    WHERE hs.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Data riwayat tidak ditemukan' });
  res.json(row);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/admin-riwayat.test.js`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/routes/admin.js server/tests/admin-riwayat.test.js && git commit -m "feat: implement UC04 riwayat hasil seleksi"
```

---

## Task 12: Admin routes — UC03 statistik + PDF/Excel export

**Files:**
- Modify: `server/src/routes/admin.js` (insert before the final `module.exports = router;` line)
- Test: `server/tests/admin-statistik.test.js`

- [ ] **Step 1: Write the failing test**

`server/tests/admin-statistik.test.js`:
```js
const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-admin-statistik.sqlite');
process.env.JWT_SECRET = 'test-secret';
const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');

afterAll(() => {
  const p = process.env.DB_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

async function loginAdmin(agent) {
  await agent.post('/api/auth/login').send({ nik: 'pengurus', password: 'pengurus123' });
}

async function seedWarga(nik, pendapatan, tanggungan, kondisiRumah) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ nama: `Warga ${nik}`, nik, password: 'password1' });
  await agent.post('/api/auth/login').send({ nik, password: 'password1' });
  await agent.put('/api/warga/me/data-administratif').send({
    kategori_kerja: 'serabutan', pekerjaan: 'Buruh', pendapatan, tanggungan,
    status_rumah: 'Kontrak', kondisi_rumah: kondisiRumah,
  });
}

test('UC03: statistik aggregates totals, income distribution, and priority histogram', async () => {
  await seedWarga('s1', 600000, 5, 'Tidak Layak');
  await seedWarga('s2', 4000000, 1, 'Layak');

  const agent = request.agent(app);
  await loginAdmin(agent);
  const res = await agent.get('/api/admin/statistik');

  expect(res.status).toBe(200);
  expect(res.body.totalWarga).toBe(2);
  expect(res.body.distribusiPendapatan.length).toBeGreaterThan(0);
  expect(res.body.donutValiditas.menunggu).toBe(2);
  expect(res.body.histogramPrioritas['Sangat Tinggi']).toBeGreaterThanOrEqual(1);
});

test('UC03: export Excel returns an xlsx file', async () => {
  await seedWarga('s3', 1200000, 2, 'Kurang Layak');
  const agent = request.agent(app);
  await loginAdmin(agent);
  const res = await agent.get('/api/admin/statistik/export?format=excel');
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toContain('spreadsheetml');
});

test('UC03: export PDF returns a pdf file', async () => {
  const agent = request.agent(app);
  await loginAdmin(agent);
  const res = await agent.get('/api/admin/statistik/export?format=pdf');
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toBe('application/pdf');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/admin-statistik.test.js`
Expected: FAIL (404s for `/statistik` and `/statistik/export`)

- [ ] **Step 3: Add the statistik and export routes**

At the top of `server/src/routes/admin.js`, add the two new requires next to the existing ones:
```js
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { tingkatPrioritas } = require('../scoring');
```

Insert into `server/src/routes/admin.js`, directly above `module.exports = router;`:
```js
const INCOME_BUCKETS = [
  { label: '< 600rb', max: 600000 },
  { label: '600rb - 1jt', max: 1000000 },
  { label: '1jt - 1.5jt', max: 1500000 },
  { label: '1.5jt - 2.5jt', max: 2500000 },
  { label: '> 2.5jt', max: Infinity },
];

function buildStatistik() {
  const warga = db.prepare(`
    SELECT w.id, d.pendapatan, d.tanggungan, d.validitas, d.skor_prioritas
    FROM warga w JOIN data_administratif d ON d.warga_id = w.id
  `).all();

  const active = db.prepare('SELECT * FROM bantuan WHERE is_active = 1').get();
  const totalWarga = warga.length;
  const totalPenerima = active
    ? db.prepare("SELECT COUNT(*) AS c FROM hasil_seleksi WHERE bantuan_id = ? AND status = 'penerima'").get(active.id).c
    : 0;

  const distribusiPendapatan = INCOME_BUCKETS.map((b) => ({ label: b.label, jumlah: 0 }));
  const donutValiditas = { valid: 0, menunggu: 0, perlu_perbaikan: 0, tidak_valid: 0 };
  const histogramPrioritas = { 'Sangat Tinggi': 0, Tinggi: 0, Sedang: 0, Rendah: 0 };
  let totalPendapatan = 0;

  for (const w of warga) {
    totalPendapatan += w.pendapatan || 0;
    donutValiditas[w.validitas] = (donutValiditas[w.validitas] || 0) + 1;
    if (w.skor_prioritas != null) {
      histogramPrioritas[tingkatPrioritas(w.skor_prioritas).label] += 1;
    }
    const bucketIdx = INCOME_BUCKETS.findIndex((b) => (w.pendapatan || 0) < b.max);
    distribusiPendapatan[bucketIdx === -1 ? INCOME_BUCKETS.length - 1 : bucketIdx].jumlah += 1;
  }

  return {
    totalWarga,
    kuota: active ? active.kuota : 0,
    totalPenerima,
    totalValid: donutValiditas.valid,
    rataRataPendapatan: totalWarga ? Math.round(totalPendapatan / totalWarga) : 0,
    distribusiPendapatan, donutValiditas, histogramPrioritas,
  };
}

router.get('/statistik', (req, res) => {
  res.json(buildStatistik());
});

router.get('/statistik/export', async (req, res) => {
  const stats = buildStatistik();
  const { format } = req.query;

  if (format === 'excel') {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Statistik');
    sheet.addRow(['Metrik', 'Nilai']);
    sheet.addRow(['Total Warga', stats.totalWarga]);
    sheet.addRow(['Kuota', stats.kuota]);
    sheet.addRow(['Total Penerima', stats.totalPenerima]);
    sheet.addRow(['Total Valid', stats.totalValid]);
    sheet.addRow(['Rata-rata Pendapatan', stats.rataRataPendapatan]);
    sheet.addRow([]);
    sheet.addRow(['Distribusi Pendapatan']);
    stats.distribusiPendapatan.forEach((d) => sheet.addRow([d.label, d.jumlah]));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="statistik-sibansos.xlsx"');
    await wb.xlsx.write(res);
    return res.end();
  }

  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="statistik-sibansos.pdf"');
    const doc = new PDFDocument();
    doc.pipe(res);
    doc.fontSize(16).text('Laporan Statistik SIBANSOS RT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total Warga: ${stats.totalWarga}`);
    doc.text(`Kuota Periode Aktif: ${stats.kuota}`);
    doc.text(`Total Penerima: ${stats.totalPenerima}`);
    doc.text(`Total Data Valid: ${stats.totalValid}`);
    doc.text(`Rata-rata Pendapatan: Rp ${stats.rataRataPendapatan.toLocaleString('id-ID')}`);
    doc.end();
    return;
  }

  res.status(400).json({ error: 'format harus pdf atau excel' });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/admin-statistik.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full backend test suite**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npm test`
Expected: All test files pass (db, scoring, auth, health, auth-routes, warga-routes, admin-bantuan, admin-warga, admin-seleksi, admin-riwayat, admin-statistik).

- [ ] **Step 6: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/routes/admin.js server/tests/admin-statistik.test.js && git commit -m "feat: implement UC03 statistik dashboard with PDF/Excel export"
```

Backend is now complete (UC01-UC10 all have working, tested endpoints). The remaining tasks build the React frontend that consumes this API.

---

## Task 13: Frontend scaffolding — Vite project, base styles, shared UI components

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.js`
- Create: `web/index.html`
- Create: `web/src/main.jsx`
- Create: `web/src/styles.css`
- Create: `web/src/components/ui.jsx`

- [ ] **Step 1: Scaffold the Vite project**

```bash
mkdir -p "/home/usb/Desktop/tugas/FP DPPL/web/src/components" "/home/usb/Desktop/tugas/FP DPPL/web/src/pages/warga" "/home/usb/Desktop/tugas/FP DPPL/web/src/pages/admin" "/home/usb/Desktop/tugas/FP DPPL/web/src/context"
```

`web/package.json`:
```json
{
  "name": "sibansos-rt-web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.8"
  }
}
```

`web/vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
});
```

`web/index.html`:
```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SIBANSOS RT</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 2: Install dependencies**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL/web" && npm install
```

Expected: `node_modules` created, no errors.

- [ ] **Step 3: Write base styles**

`web/src/styles.css`:
```css
:root {
  --blue: oklch(0.52 0.14 255);
  --green: oklch(0.55 0.13 150);
  --amber: oklch(0.65 0.15 80);
  --red: oklch(0.55 0.18 25);
  --gray: oklch(0.55 0.02 255);
  --bg: oklch(0.97 0.005 255);
  --card: oklch(1 0 0);
  --border: oklch(0.88 0.01 255);
  --text: oklch(0.25 0.02 255);
}
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); }
.app { display: flex; min-height: 100vh; }
.sidebar { width: 220px; background: var(--card); border-right: 1px solid var(--border); padding: 16px; }
.sidebar nav { display: flex; flex-direction: column; gap: 4px; margin-top: 16px; }
.sidebar a { padding: 10px 12px; border-radius: 8px; color: var(--text); text-decoration: none; }
.sidebar a.active { background: var(--blue); color: white; }
.main { flex: 1; padding: 24px; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
.grid { display: grid; gap: 16px; }
.grid-4 { grid-template-columns: repeat(4, 1fr); }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px; text-align: left; border-bottom: 1px solid var(--border); }
.badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.badge-green { background: color-mix(in oklch, var(--green) 18%, white); color: var(--green); }
.badge-amber { background: color-mix(in oklch, var(--amber) 18%, white); color: var(--amber); }
.badge-red { background: color-mix(in oklch, var(--red) 18%, white); color: var(--red); }
.badge-blue { background: color-mix(in oklch, var(--blue) 18%, white); color: var(--blue); }
.badge-gray { background: color-mix(in oklch, var(--gray) 18%, white); color: var(--gray); }
.btn { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); cursor: pointer; font-weight: 600; }
.btn-primary { background: var(--blue); color: white; border-color: var(--blue); }
.btn-ghost { background: transparent; border-color: transparent; }
input, select, textarea { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); font-size: 14px; width: 100%; }
.field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.toast-host { position: fixed; bottom: 16px; right: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 50; }
.toast { padding: 10px 16px; border-radius: 8px; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
.quota-bar { height: 10px; border-radius: 999px; background: var(--border); overflow: hidden; }
.quota-bar > div { height: 100%; background: var(--blue); }
.quota-bar.over > div { background: var(--red); }
```

- [ ] **Step 4: Write shared UI components**

`web/src/components/ui.jsx`:
```jsx
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'blue') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-host">
        {toasts.map((t) => (
          <div key={t.id} className="toast" style={{ background: `var(--${t.tone})` }}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function Badge({ tone, children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Card({ title, children, actions }) {
  return (
    <div className="card">
      {(title || actions) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          {title && <h3 style={{ margin: 0 }}>{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Verify the dev server boots**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL/web" && timeout 5 npm run dev || true
```

Expected: Vite prints "Local: http://localhost:5173/" before the timeout kills it (a `main.jsx` entry doesn't exist yet, so the browser page will be blank — that's expected at this step; Task 14 adds it).

- [ ] **Step 6: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add web/package.json web/vite.config.js web/index.html web/src/styles.css web/src/components/ui.jsx && git commit -m "chore: scaffold Vite frontend with shared UI components"
```

---

## Task 14: API client, AuthContext, route guards, and app shell

**Files:**
- Create: `web/src/api.js`
- Create: `web/src/context/AuthContext.jsx`
- Create: `web/src/components/Sidebar.jsx`
- Create: `web/src/App.jsx`
- Create: `web/src/main.jsx`

- [ ] **Step 1: Write the API client**

`web/src/api.js`:
```js
async function request(method, url, body, isMultipart) {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: isMultipart ? undefined : { 'Content-Type': 'application/json' },
    body: body ? (isMultipart ? body : JSON.stringify(body)) : undefined,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  postForm: (url, formData) => request('POST', url, formData, true),
};
```

- [ ] **Step 2: Write the auth context**

`web/src/context/AuthContext.jsx`:
```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = anonymous

  async function refresh() {
    try {
      const me = await api.get('/api/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function login(nik, password) {
    await api.post('/api/auth/login', { nik, password });
    await refresh();
  }

  async function register(nama, nik, password) {
    await api.post('/api/auth/register', { nama, nik, password });
    await login(nik, password);
  }

  async function logout() {
    await api.post('/api/auth/logout');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 3: Write the sidebar component**

`web/src/components/Sidebar.jsx`:
```jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ADMIN_LINKS = [
  { to: '/admin/statistik', label: 'Statistik & Beranda' },
  { to: '/admin/kuota', label: 'Atur Kuota' },
  { to: '/admin/verifikasi', label: 'Verifikasi Data Warga' },
  { to: '/admin/status', label: 'Status Penerima Bantuan' },
  { to: '/admin/riwayat', label: 'Riwayat Hasil Seleksi' },
];

const WARGA_LINKS = [
  { to: '/warga/data', label: 'Data Administratif' },
  { to: '/warga/foto', label: 'Foto Kondisi Rumah' },
  { to: '/warga/status', label: 'Status Bantuan' },
  { to: '/warga/profil', label: 'Profil Saya' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const links = user?.role === 'admin' ? ADMIN_LINKS : WARGA_LINKS;
  return (
    <aside className="sidebar">
      <strong>SIBANSOS RT</strong>
      <nav>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={logout}>Keluar</button>
    </aside>
  );
}
```

- [ ] **Step 4: Write the app shell with route guards**

`web/src/App.jsx`:
```jsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DataAdministratif } from './pages/warga/DataAdministratif';
import { FotoRumah } from './pages/warga/FotoRumah';
import { StatusBantuanWarga } from './pages/warga/StatusBantuanWarga';
import { ProfilWarga } from './pages/warga/ProfilWarga';
import { Kuota } from './pages/admin/Kuota';
import { Verifikasi } from './pages/admin/Verifikasi';
import { StatusSeleksi } from './pages/admin/StatusSeleksi';
import { Riwayat } from './pages/admin/Riwayat';
import { Statistik } from './pages/admin/Statistik';

function Protected({ role, children }) {
  const { user } = useAuth();
  if (user === undefined) return <p>Memuat...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return (
    <div className="app">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/daftar" element={<Register />} />

      <Route path="/warga/data" element={<Protected role="warga"><DataAdministratif /></Protected>} />
      <Route path="/warga/foto" element={<Protected role="warga"><FotoRumah /></Protected>} />
      <Route path="/warga/status" element={<Protected role="warga"><StatusBantuanWarga /></Protected>} />
      <Route path="/warga/profil" element={<Protected role="warga"><ProfilWarga /></Protected>} />

      <Route path="/admin/kuota" element={<Protected role="admin"><Kuota /></Protected>} />
      <Route path="/admin/verifikasi" element={<Protected role="admin"><Verifikasi /></Protected>} />
      <Route path="/admin/status" element={<Protected role="admin"><StatusSeleksi /></Protected>} />
      <Route path="/admin/riwayat" element={<Protected role="admin"><Riwayat /></Protected>} />
      <Route path="/admin/statistik" element={<Protected role="admin"><Statistik /></Protected>} />

      <Route
        path="/"
        element={
          user === undefined ? <p>Memuat...</p> :
          user?.role === 'admin' ? <Navigate to="/admin/statistik" replace /> :
          user?.role === 'warga' ? <Navigate to="/warga/data" replace /> :
          <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}
```

- [ ] **Step 5: Write the entry point**

`web/src/main.jsx`:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

This task references page components (`Login`, `Register`, and the warga/admin pages) that don't exist yet — that's expected. Tasks 15-17 create them; the app won't compile until then, so skip the dev-server check for this task and run it once at the end of Task 17 instead.

- [ ] **Step 6: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add web/src/api.js web/src/context web/src/components/Sidebar.jsx web/src/App.jsx web/src/main.jsx && git commit -m "feat: add API client, auth context, and route guards"
```

---

## Task 15: Login and registration pages

**Files:**
- Create: `web/src/pages/Login.jsx`
- Create: `web/src/pages/Register.jsx`

- [ ] **Step 1: Write the login page**

`web/src/pages/Login.jsx`:
```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(nik, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto' }}>
      <h1>SIBANSOS RT</h1>
      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label>NIK / Username</label>
          <input value={nik} onChange={(e) => setNik(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Masuk</button>
      </form>
      <p>Warga baru? <Link to="/daftar">Daftar di sini</Link></p>
    </div>
  );
}
```

- [ ] **Step 2: Write the registration page**

`web/src/pages/Register.jsx`:
```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Register() {
  const [nama, setNama] = useState('');
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await register(nama, nik, password);
      navigate('/warga/data');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto' }}>
      <h1>Daftar Warga</h1>
      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label>Nama Lengkap</label>
          <input value={nama} onChange={(e) => setNama(e.target.value)} required />
        </div>
        <div className="field">
          <label>NIK</label>
          <input value={nik} onChange={(e) => setNik(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Daftar</button>
      </form>
      <p>Sudah punya akun? <Link to="/login">Masuk di sini</Link></p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add web/src/pages/Login.jsx web/src/pages/Register.jsx && git commit -m "feat: add login and warga registration pages"
```

---

## Task 16: Warga pages — UC06, UC07, UC08, UC09

**Files:**
- Create: `web/src/pages/warga/DataAdministratif.jsx`
- Create: `web/src/pages/warga/FotoRumah.jsx`
- Create: `web/src/pages/warga/StatusBantuanWarga.jsx`
- Create: `web/src/pages/warga/ProfilWarga.jsx`

- [ ] **Step 1: UC06 — data administratif form**

`web/src/pages/warga/DataAdministratif.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../components/ui';

const EMPTY = {
  kategori_kerja: 'serabutan', pekerjaan: '', pendapatan: '', tanggungan: '',
  status_rumah: 'Kontrak', kondisi_rumah: 'Kurang Layak',
};

export function DataAdministratif() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.get('/api/warga/me/profile').then((p) => {
      if (p.data_administratif) {
        setForm({
          kategori_kerja: p.data_administratif.kategori_kerja || 'serabutan',
          pekerjaan: p.data_administratif.pekerjaan || '',
          pendapatan: p.data_administratif.pendapatan ?? '',
          tanggungan: p.data_administratif.tanggungan ?? '',
          status_rumah: p.data_administratif.status_rumah || 'Kontrak',
          kondisi_rumah: p.data_administratif.kondisi_rumah || 'Kurang Layak',
        });
      }
    });
  }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put('/api/warga/me/data-administratif', form);
      toast('Data administratif berhasil disimpan.', 'green');
    } catch (err) {
      setError(err.message);
      toast(err.message, 'red');
    }
  }

  return (
    <div>
      <h1>Data Administratif</h1>
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Kategori Stabilitas Kerja</label>
          <select value={form.kategori_kerja} onChange={(e) => update('kategori_kerja', e.target.value)}>
            <option value="tetap">Tetap</option>
            <option value="serabutan">Serabutan</option>
            <option value="tidak_bekerja">Tidak Bekerja</option>
          </select>
        </div>
        <div className="field">
          <label>Pekerjaan</label>
          <input value={form.pekerjaan} onChange={(e) => update('pekerjaan', e.target.value)} />
        </div>
        <div className="field">
          <label>Pendapatan Keluarga / bulan (Rp)</label>
          <input type="number" min="0" value={form.pendapatan} onChange={(e) => update('pendapatan', e.target.value)} required />
        </div>
        <div className="field">
          <label>Jumlah Tanggungan</label>
          <input type="number" min="0" value={form.tanggungan} onChange={(e) => update('tanggungan', e.target.value)} required />
        </div>
        <div className="field">
          <label>Status Kepemilikan Rumah</label>
          <select value={form.status_rumah} onChange={(e) => update('status_rumah', e.target.value)}>
            <option>Milik Sendiri</option>
            <option>Kontrak</option>
            <option>Menumpang</option>
          </select>
        </div>
        <div className="field">
          <label>Kondisi Rumah</label>
          <select value={form.kondisi_rumah} onChange={(e) => update('kondisi_rumah', e.target.value)}>
            <option>Layak</option>
            <option>Kurang Layak</option>
            <option>Tidak Layak</option>
          </select>
        </div>
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Simpan Data</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: UC07 — upload foto kondisi rumah**

`web/src/pages/warga/FotoRumah.jsx`:
```jsx
import { useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../components/ui';

const JENIS_LIST = [
  { value: 'eksterior', label: 'Eksterior' },
  { value: 'interior', label: 'Interior' },
  { value: 'lingkungan', label: 'Lingkungan' },
];

export function FotoRumah() {
  const [jenis, setJenis] = useState('eksterior');
  const [file, setFile] = useState(null);
  const [deskripsi, setDeskripsi] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!file) { setError('Pilih file foto terlebih dahulu.'); return; }
    const formData = new FormData();
    formData.append('jenis', jenis);
    formData.append('deskripsi', deskripsi);
    formData.append('foto', file);
    try {
      await api.postForm('/api/warga/me/foto', formData);
      toast('Foto berhasil diunggah.', 'green');
      setFile(null);
      setDeskripsi('');
    } catch (err) {
      setError(err.message);
      toast(err.message, 'red');
    }
  }

  return (
    <div>
      <h1>Unggah Foto Kondisi Rumah</h1>
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Jenis Foto</label>
          <select value={jenis} onChange={(e) => setJenis(e.target.value)}>
            {JENIS_LIST.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>File Foto</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required />
        </div>
        <div className="field">
          <label>Deskripsi (opsional)</label>
          <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={3} />
        </div>
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Unggah Foto</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: UC08 — status penerimaan bantuan**

`web/src/pages/warga/StatusBantuanWarga.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Badge } from '../../components/ui';

const STATUS_META = {
  penerima: { label: 'Penerima', tone: 'green' },
  cadangan: { label: 'Daftar Cadangan', tone: 'blue' },
  menunggu: { label: 'Menunggu', tone: 'amber' },
  bukan: { label: 'Bukan Penerima', tone: 'gray' },
  belum_diseleksi: { label: 'Belum Diseleksi', tone: 'gray' },
};

export function StatusBantuanWarga() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/api/warga/me/status').then(setData); }, []);

  if (!data) return <p>Memuat...</p>;
  const meta = STATUS_META[data.status] || STATUS_META.belum_diseleksi;

  return (
    <div>
      <h1>Status Penerimaan Bantuan</h1>
      <div className="card" style={{ maxWidth: 480 }}>
        {data.bantuan && <p><strong>Periode:</strong> {data.bantuan.periode} ({data.bantuan.nama_bantuan})</p>}
        <p><strong>Status:</strong> <Badge tone={meta.tone}>{meta.label}</Badge></p>
        {data.catatan && <p><strong>Catatan Pengurus RT:</strong> {data.catatan}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: UC09 — profil pribadi**

`web/src/pages/warga/ProfilWarga.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../components/ui';

export function ProfilWarga() {
  const [form, setForm] = useState({ nama: '', nik: '', alamat: '', no_telepon: '' });
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.get('/api/warga/me/profile').then((p) => {
      setForm({ nama: p.nama, nik: p.nik, alamat: p.alamat || '', no_telepon: p.no_telepon || '' });
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put('/api/warga/me/profile', { alamat: form.alamat, no_telepon: form.no_telepon });
      toast('Profil berhasil diperbarui. Status validitas direset ke Menunggu.', 'amber');
    } catch (err) {
      setError(err.message);
      toast(err.message, 'red');
    }
  }

  return (
    <div>
      <h1>Profil Saya</h1>
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Nama</label>
          <input value={form.nama} disabled />
        </div>
        <div className="field">
          <label>NIK</label>
          <input value={form.nik} disabled />
        </div>
        <div className="field">
          <label>Alamat</label>
          <textarea rows={2} value={form.alamat} onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))} />
        </div>
        <div className="field">
          <label>No. Telepon</label>
          <input value={form.no_telepon} onChange={(e) => setForm((f) => ({ ...f, no_telepon: e.target.value }))} />
        </div>
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Simpan Perubahan</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add web/src/pages/warga && git commit -m "feat: implement warga pages for UC06-UC09"
```

---

## Task 17: Admin pages — UC01, UC02, UC05, UC10, UC04, UC03

**Files:**
- Create: `web/src/pages/admin/Kuota.jsx`
- Create: `web/src/pages/admin/Verifikasi.jsx`
- Create: `web/src/pages/admin/UbahWarga.jsx`
- Create: `web/src/pages/admin/StatusSeleksi.jsx`
- Create: `web/src/pages/admin/Riwayat.jsx`
- Create: `web/src/pages/admin/Statistik.jsx`
- Modify: `web/src/App.jsx`

- [ ] **Step 1: UC01 — atur kuota**

`web/src/pages/admin/Kuota.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../components/ui';

export function Kuota() {
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ nama_bantuan: '', jenis_bantuan: '', kuota: '', nominal: '', periode: '' });
  const [error, setError] = useState('');
  const toast = useToast();

  function loadActive() {
    api.get('/api/admin/bantuan/active').then(setActive).catch(() => setActive(null));
  }
  useEffect(loadActive, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/admin/bantuan', form);
      toast('Periode dan kuota bantuan berhasil disimpan.', 'green');
      loadActive();
    } catch (err) {
      setError(err.message);
      toast(err.message, 'red');
    }
  }

  return (
    <div>
      <h1>Atur Kuota Penerima Bantuan</h1>
      {active && (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Periode aktif saat ini:</strong> {active.periode} — Kuota {active.kuota} — {active.nama_bantuan}
        </div>
      )}
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Nama Bantuan</label>
          <input value={form.nama_bantuan} onChange={(e) => setForm((f) => ({ ...f, nama_bantuan: e.target.value }))} required />
        </div>
        <div className="field">
          <label>Jenis Bantuan</label>
          <input value={form.jenis_bantuan} onChange={(e) => setForm((f) => ({ ...f, jenis_bantuan: e.target.value }))} />
        </div>
        <div className="field">
          <label>Kuota Penerima</label>
          <input type="number" min="1" value={form.kuota} onChange={(e) => setForm((f) => ({ ...f, kuota: e.target.value }))} required />
        </div>
        <div className="field">
          <label>Nominal per Penerima (Rp)</label>
          <input type="number" min="0" value={form.nominal} onChange={(e) => setForm((f) => ({ ...f, nominal: e.target.value }))} />
        </div>
        <div className="field">
          <label>Periode</label>
          <input value={form.periode} onChange={(e) => setForm((f) => ({ ...f, periode: e.target.value }))} placeholder="contoh: Triwulan II 2026" required />
        </div>
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Buka Periode Baru</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: UC02 — verifikasi data warga**

`web/src/pages/admin/Verifikasi.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Badge, useToast } from '../../components/ui';

const VALIDITAS_META = {
  valid: { label: 'Valid', tone: 'green' },
  menunggu: { label: 'Menunggu', tone: 'amber' },
  perlu_perbaikan: { label: 'Perlu Perbaikan', tone: 'red' },
  tidak_valid: { label: 'Tidak Valid', tone: 'red' },
};

export function Verifikasi() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const toast = useToast();

  function load() {
    const params = new URLSearchParams();
    if (filter) params.set('validitas', filter);
    if (search) params.set('search', search);
    api.get(`/api/admin/warga?${params}`).then(setList);
  }
  useEffect(load, [filter, search]);

  async function openDetail(id) {
    const detail = await api.get(`/api/admin/warga/${id}`);
    setSelected({
      ...detail,
      catatan_verifikasi: detail.catatan_verifikasi || '',
      chk_ktp: detail.chk_ktp, chk_kk: detail.chk_kk,
      chk_pendapatan: detail.chk_pendapatan, chk_foto: detail.chk_foto,
    });
  }

  async function saveValiditas(validitas) {
    try {
      await api.put(`/api/admin/warga/${selected.id}/validitas`, {
        validitas, catatan_verifikasi: selected.catatan_verifikasi,
        chk_ktp: selected.chk_ktp, chk_kk: selected.chk_kk,
        chk_pendapatan: selected.chk_pendapatan, chk_foto: selected.chk_foto,
      });
      toast('Status validitas berhasil disimpan.', 'green');
      setSelected(null);
      load();
    } catch (err) {
      toast(err.message, 'red');
    }
  }

  return (
    <div>
      <h1>Verifikasi Data Warga</h1>
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Semua</option>
          <option value="menunggu">Menunggu</option>
          <option value="valid">Valid</option>
          <option value="perlu_perbaikan">Perlu Perbaikan</option>
        </select>
        <input placeholder="Cari nama atau NIK" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Nama</th><th>NIK</th><th>Validitas</th><th></th></tr></thead>
          <tbody>
            {list.map((w) => (
              <tr key={w.id}>
                <td>{w.nama}</td>
                <td>{w.nik}</td>
                <td><Badge tone={VALIDITAS_META[w.validitas].tone}>{VALIDITAS_META[w.validitas].label}</Badge></td>
                <td>
                  <button className="btn" onClick={() => openDetail(w.id)}>Periksa</button>{' '}
                  <Link className="btn" to={`/admin/warga/${w.id}/ubah`}>Ubah</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 16, maxWidth: 480 }}>
          <h3>Periksa: {selected.nama}</h3>
          <p>Pendapatan: Rp {Number(selected.pendapatan || 0).toLocaleString('id-ID')} — Tanggungan: {selected.tanggungan}</p>
          <p>Foto kondisi rumah: {selected.foto.length} berkas terunggah</p>
          {['chk_ktp', 'chk_kk', 'chk_pendapatan', 'chk_foto'].map((key) => (
            <label key={key} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={!!selected[key]}
                onChange={(e) => setSelected((s) => ({ ...s, [key]: e.target.checked }))}
              />{' '}
              {{ chk_ktp: 'KTP sesuai', chk_kk: 'KK valid', chk_pendapatan: 'Kewajaran pendapatan', chk_foto: 'Kelengkapan foto rumah' }[key]}
            </label>
          ))}
          <div className="field">
            <label>Catatan Verifikasi</label>
            <textarea
              value={selected.catatan_verifikasi}
              onChange={(e) => setSelected((s) => ({ ...s, catatan_verifikasi: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => saveValiditas('valid')}>Tetapkan Valid</button>
            <button className="btn" onClick={() => saveValiditas('perlu_perbaikan')}>Perlu Perbaikan</button>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: UC05 — ubah data warga with live score preview**

`web/src/pages/admin/UbahWarga.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useToast } from '../../components/ui';

export function UbahWarga() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [skorLama, setSkorLama] = useState(null);
  const [skorBaru, setSkorBaru] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/admin/warga/${id}`).then((w) => {
      setForm({
        nama: w.nama, alamat: w.alamat || '', no_telepon: w.no_telepon || '',
        kategori_kerja: w.kategori_kerja || 'serabutan', pekerjaan: w.pekerjaan || '',
        pendapatan: w.pendapatan ?? '', tanggungan: w.tanggungan ?? '',
        status_rumah: w.status_rumah || 'Kontrak', kondisi_rumah: w.kondisi_rumah || 'Kurang Layak',
      });
      setSkorLama(w.skor_prioritas);
      setSkorBaru(w.skor_prioritas);
    });
  }, [id]);

  useEffect(() => {
    if (!form || form.pendapatan === '' || form.tanggungan === '') return;
    const timer = setTimeout(() => {
      api.post('/api/admin/skor-preview', {
        pendapatan: form.pendapatan, tanggungan: form.tanggungan,
        kondisiRumah: form.kondisi_rumah, statusRumah: form.status_rumah, kategoriKerja: form.kategori_kerja,
      }).then((r) => setSkorBaru(r.skor));
    }, 250);
    return () => clearTimeout(timer);
  }, [form]);

  if (!form) return <p>Memuat...</p>;

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/api/admin/warga/${id}`, form);
      toast('Data warga berhasil diperbarui. Validitas direset ke Menunggu.', 'amber');
      navigate('/admin/verifikasi');
    } catch (err) {
      setError(err.message);
      toast(err.message, 'red');
    }
  }

  const delta = skorBaru != null && skorLama != null ? skorBaru - skorLama : 0;

  return (
    <div>
      <h1>Ubah Data Warga — {form.nama}</h1>
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Kategori Stabilitas Kerja</label>
          <select value={form.kategori_kerja} onChange={(e) => update('kategori_kerja', e.target.value)}>
            <option value="tetap">Tetap</option>
            <option value="serabutan">Serabutan</option>
            <option value="tidak_bekerja">Tidak Bekerja</option>
          </select>
        </div>
        <div className="field">
          <label>Pendapatan Keluarga / bulan (Rp)</label>
          <input type="number" min="0" value={form.pendapatan} onChange={(e) => update('pendapatan', e.target.value)} required />
        </div>
        <div className="field">
          <label>Jumlah Tanggungan</label>
          <input type="number" min="0" value={form.tanggungan} onChange={(e) => update('tanggungan', e.target.value)} required />
        </div>
        <div className="field">
          <label>Status Kepemilikan</label>
          <select value={form.status_rumah} onChange={(e) => update('status_rumah', e.target.value)}>
            <option>Milik Sendiri</option>
            <option>Kontrak</option>
            <option>Menumpang</option>
          </select>
        </div>
        <div className="field">
          <label>Kondisi Rumah</label>
          <select value={form.kondisi_rumah} onChange={(e) => update('kondisi_rumah', e.target.value)}>
            <option>Layak</option>
            <option>Kurang Layak</option>
            <option>Tidak Layak</option>
          </select>
        </div>

        <div className="card" style={{ background: 'var(--bg)', marginBottom: 12 }}>
          <strong>Pratinjau Skor Prioritas (Real-time)</strong>
          <p style={{ fontSize: 24, margin: '4px 0' }}>
            {skorBaru} / 100{' '}
            {delta !== 0 && (
              <span style={{ color: delta > 0 ? 'var(--red)' : 'var(--green)', fontSize: 14 }}>
                ({delta > 0 ? '+' : ''}{delta} dari skor lama {skorLama})
              </span>
            )}
          </p>
        </div>

        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Simpan Perubahan</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: UC10 — status penerima bantuan (seleksi)**

`web/src/pages/admin/StatusSeleksi.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Badge, useToast } from '../../components/ui';

const STATUS_META = {
  penerima: { label: 'Penerima', tone: 'green' },
  cadangan: { label: 'Cadangan', tone: 'blue' },
  menunggu: { label: 'Menunggu', tone: 'amber' },
  bukan: { label: 'Bukan Penerima', tone: 'gray' },
};

export function StatusSeleksi() {
  const [list, setList] = useState([]);
  const [active, setActive] = useState(null);
  const toast = useToast();

  function load() {
    api.get('/api/admin/bantuan/active').then(setActive).catch(() => setActive(null));
    api.get('/api/admin/seleksi').then(setList).catch(() => setList([]));
  }
  useEffect(load, []);

  const terisi = list.filter((r) => r.status === 'penerima').length;
  const overQuota = active && terisi > active.kuota;

  async function setStatus(row, status) {
    if ((row.validitas === 'menunggu' || row.validitas === 'perlu_perbaikan') && status === 'penerima') {
      toast('Peringatan: data warga ini belum Valid. Tetap dilanjutkan atas keputusan Pengurus RT.', 'amber');
    }
    try {
      await api.put(`/api/admin/seleksi/${row.id}`, { status, catatan: row.catatan });
      toast('Status bantuan berhasil diperbarui dan notifikasi terkirim ke warga.', 'green');
      load();
    } catch (err) {
      toast(err.message, 'red');
    }
  }

  return (
    <div>
      <h1>Status Penerima Bantuan</h1>
      {active && (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Kuota terisi: {terisi} / {active.kuota}</strong>
          <div className={`quota-bar ${overQuota ? 'over' : ''}`} style={{ marginTop: 8 }}>
            <div style={{ width: `${Math.min(100, (terisi / active.kuota) * 100)}%` }} />
          </div>
          {overQuota && <p style={{ color: 'var(--red)' }}>Kuota terlampaui (Over Quota)!</p>}
        </div>
      )}
      <div className="card">
        <table>
          <thead><tr><th>Nama</th><th>NIK</th><th>Skor</th><th>Validitas</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.nama}</td>
                <td>{row.nik}</td>
                <td>{row.skor_prioritas}</td>
                <td>{row.validitas}</td>
                <td><Badge tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Badge></td>
                <td>
                  <select value={row.status} onChange={(e) => setStatus(row, e.target.value)}>
                    <option value="menunggu">Menunggu</option>
                    <option value="penerima">Penerima</option>
                    <option value="cadangan">Cadangan</option>
                    <option value="bukan">Bukan Penerima</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: UC04 — riwayat hasil seleksi**

`web/src/pages/admin/Riwayat.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Badge } from '../../components/ui';

const STATUS_META = {
  penerima: { label: 'Penerima', tone: 'green' },
  cadangan: { label: 'Cadangan', tone: 'blue' },
  menunggu: { label: 'Menunggu', tone: 'amber' },
  bukan: { label: 'Bukan Penerima', tone: 'gray' },
};

export function Riwayat() {
  const [list, setList] = useState([]);
  const [periode, setPeriode] = useState('');

  useEffect(() => {
    const params = periode ? `?periode=${encodeURIComponent(periode)}` : '';
    api.get(`/api/admin/riwayat${params}`).then(setList);
  }, [periode]);

  const periodeOptions = [...new Set(list.map((r) => r.periode))];

  return (
    <div>
      <h1>Riwayat Hasil Seleksi</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <select value={periode} onChange={(e) => setPeriode(e.target.value)}>
          <option value="">Semua Periode</option>
          {periodeOptions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Periode</th><th>Nama</th><th>NIK</th><th>Skor</th><th>Status</th><th>Catatan</th></tr></thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.periode}</td>
                <td>{row.nama}</td>
                <td>{row.nik}</td>
                <td>{row.skor_prioritas}</td>
                <td><Badge tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Badge></td>
                <td>{row.catatan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: UC03 — statistik dashboard with export**

`web/src/pages/admin/Statistik.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Card } from '../../components/ui';

export function Statistik() {
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get('/api/admin/statistik').then(setStats); }, []);

  if (!stats) return <p>Memuat...</p>;

  function exportFile(format) {
    window.open(`/api/admin/statistik/export?format=${format}`, '_blank');
  }

  return (
    <div>
      <h1>Statistik & Beranda</h1>
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Card title="Total Warga"><h2>{stats.totalWarga}</h2></Card>
        <Card title="Kuota / Penerima"><h2>{stats.totalPenerima} / {stats.kuota}</h2></Card>
        <Card title="Data Valid"><h2>{stats.totalValid}</h2></Card>
        <Card title="Rata-rata Pendapatan"><h2>Rp {stats.rataRataPendapatan.toLocaleString('id-ID')}</h2></Card>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Card title="Distribusi Pendapatan per Kapita">
          {stats.distribusiPendapatan.map((d) => (
            <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>{d.label}</span><strong>{d.jumlah}</strong>
            </div>
          ))}
        </Card>
        <Card title="Status Validitas">
          {Object.entries(stats.donutValiditas).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>{k}</span><strong>{v}</strong>
            </div>
          ))}
        </Card>
      </div>

      <Card title="Distribusi Prioritas (Asisten AI)" actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => exportFile('excel')}>Unduh Excel</button>
          <button className="btn" onClick={() => exportFile('pdf')}>Unduh PDF</button>
        </div>
      }>
        {Object.entries(stats.histogramPrioritas).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span>{k}</span><strong>{v}</strong>
          </div>
        ))}
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: Wire the new `/admin/warga/:id/ubah` route**

In `web/src/App.jsx`, add the import next to the other admin page imports:
```jsx
import { UbahWarga } from './pages/admin/UbahWarga';
```

And add the route next to the other `/admin/*` routes:
```jsx
<Route path="/admin/warga/:id/ubah" element={<Protected role="admin"><UbahWarga /></Protected>} />
```

- [ ] **Step 8: Run the dev server and smoke-check it compiles**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL/web" && timeout 6 npm run dev || true
```

Expected: Vite prints "Local: http://localhost:5173/" with no compile errors in the output.

- [ ] **Step 9: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add web/src/pages/admin web/src/App.jsx && git commit -m "feat: implement admin pages for UC01-UC05, UC10, UC03-UC04"
```

---

## Task 18: Top-level run scripts and end-to-end manual smoke test

**Files:**
- Create: `package.json` (repo root, orchestration only)
- Create: `server/.env.example`

- [ ] **Step 1: Add a root orchestration package.json**

`package.json` (at `/home/usb/Desktop/tugas/FP DPPL/package.json`):
```json
{
  "name": "sibansos-rt",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:server": "npm --prefix server run dev",
    "dev:web": "npm --prefix web run dev",
    "test:server": "npm --prefix server test"
  }
}
```

`server/.env.example`:
```
PORT=4000
JWT_SECRET=change-me-in-production
WEB_ORIGIN=http://localhost:5173
```

- [ ] **Step 2: Run both servers and smoke-test every use case manually**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && npm run dev:server &
cd "/home/usb/Desktop/tugas/FP DPPL" && npm run dev:web
```

With both running, open `http://localhost:5173` and walk through:
1. `/daftar` — register a new warga (UC06 prerequisite) → redirected into the warga app.
2. `/warga/data` — submit data administratif (UC06) → toast confirms save.
3. `/warga/foto` — upload a photo for each of the 3 jenis (UC07) → toast confirms each upload.
4. `/warga/status` — confirms "Belum Diseleksi" before any periode exists (UC08).
5. `/warga/profil` — edit alamat/no_telepon (UC09) → toast confirms reset to "Menunggu".
6. Log out, log in as `pengurus` / `pengurus123` (seeded admin).
7. `/admin/kuota` — open a periode with kuota 5 (UC01).
8. `/admin/verifikasi` — open the new warga's detail, check the checklist, set Valid (UC02).
9. `/admin/status` — confirm the warga appears ranked by score, set status to Penerima, watch the quota bar (UC10).
10. Log back in as the warga — `/warga/status` now shows "Penerima" (UC08 + notification from UC10).
11. `/admin/riwayat` — open a second periode from `/admin/kuota`, confirm the first periode now appears here (UC04).
12. `/admin/statistik` — confirm the cards/sections populate, click "Unduh Excel" and "Unduh PDF" and confirm both downloads open (UC03).
13. `/admin/verifikasi` → "Ubah" on a warga — change pendapatan/tanggungan and watch the live score preview update before saving (UC05).

Expected: every step succeeds with a success toast and no console errors in the browser dev tools.

- [ ] **Step 3: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add package.json server/.env.example && git commit -m "chore: add root dev scripts and env example"
```

---

## Plan Self-Review Notes

- **Spec coverage:** UC01 (Task 8), UC02 (Task 9), UC03 (Task 12), UC04 (Task 11), UC05 (Task 9 backend / Task 17 Step 3 frontend), UC06 (Task 7 / Task 16 Step 1), UC07 (Task 7 / Task 16 Step 2), UC08 (Task 7 / Task 16 Step 3), UC09 (Task 7 / Task 16 Step 4), UC10 (Task 10 / Task 17 Step 4). Registration (prerequisite for UC06-UC09, not its own UC) is Task 6. All class-diagram entities (`PenggunaRT`→`users`, `Warga`→`warga`, `Bantuan`→`bantuan`, `ModelAI`→`scoring.js`, `DataAdministratif`→`data_administratif`, `HasilSeleksi`→`hasil_seleksi`, `Statistik`→computed in Task 12) are represented.
- **Type consistency checked:** `validitas` values (`menunggu`/`valid`/`perlu_perbaikan`/`tidak_valid`) and `status` values (`menunggu`/`penerima`/`cadangan`/`bukan`) are used identically across `db.js`, every route file, and every frontend page. The `hitungSkor`/`tingkatPrioritas`/`rekomendasiAI` signatures from Task 3 are called with matching argument shapes in Tasks 7, 9, and 12.
- **No placeholders:** every step above contains complete, runnable code; no task defers logic with "TODO" or "add validation later."

