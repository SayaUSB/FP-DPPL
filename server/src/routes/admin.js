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
