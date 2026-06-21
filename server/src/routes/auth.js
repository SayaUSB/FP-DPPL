const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { signToken, requireAuth } = require('../auth');

const router = express.Router();

const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 };

// System boundary from the DPPL spec: scoped to one RT, max 50 kepala keluarga.
const MAX_WARGA = 50;

router.post('/register', (req, res) => {
  const { nama, nik, no_kk, password } = req.body;
  if (!nama || !nik || !password || password.length < 6) {
    return res.status(400).json({ error: 'nama, nik, and password (min 6 chars) are required' });
  }
  const existing = db.prepare('SELECT 1 FROM warga WHERE nik = ?').get(nik);
  if (existing) return res.status(400).json({ error: 'NIK sudah terdaftar' });

  const totalWarga = db.prepare('SELECT COUNT(*) AS c FROM warga').get().c;
  if (totalWarga >= MAX_WARGA) {
    return res.status(400).json({ error: `Kuota pendaftaran warga sudah penuh (maksimal ${MAX_WARGA} KK per RT)` });
  }

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
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
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
