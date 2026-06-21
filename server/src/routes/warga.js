const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { hitungSkor } = require('../scoring');
const { classifyKondisiRumah } = require('../vlm');

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

  const wargaId = getWargaId(req);
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO foto_rumah (warga_id, jenis, file_path, deskripsi) VALUES (?, ?, ?, ?)'
  ).run(wargaId, jenis, req.file.filename, deskripsi || null);

  db.prepare(`
    UPDATE data_administratif SET chk_foto = 1, updated_at = datetime('now') WHERE warga_id = ?
  `).run(wargaId);

  const distinctJenis = db.prepare(
    'SELECT COUNT(DISTINCT jenis) AS c FROM foto_rumah WHERE warga_id = ?'
  ).get(wargaId).c;

  if (distinctJenis === 3) {
    const latestPerJenis = db.prepare(`
      SELECT f.jenis, f.file_path FROM foto_rumah f
      WHERE f.warga_id = ? AND f.id = (
        SELECT MAX(id) FROM foto_rumah WHERE warga_id = f.warga_id AND jenis = f.jenis
      )
    `).all(wargaId).map((f) => ({ jenis: f.jenis, file_path: path.join(__dirname, '..', '..', 'uploads', f.file_path) }));

    classifyKondisiRumah(latestPerJenis)
      .then((result) => {
        if (!result) return;
        db.prepare(
          'UPDATE data_administratif SET ai_kondisi_saran = ?, ai_kondisi_alasan = ? WHERE warga_id = ?'
        ).run(result.kondisi, result.alasan, wargaId);
      })
      .catch(() => {});
  }

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
