const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { hitungSkor } = require('../scoring');
const { classifyKondisiRumah } = require('../vlm');
const { KONDISI_RUMAH } = require('../constants');

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

// Per-warga sequencing for the VLM advisory: at most one classification run
// in flight per warga at a time. A new trigger while one is already running
// doesn't spawn a parallel run (avoids hammering Ollama with N concurrent
// requests on rapid re-uploads) — it just marks that one more run should
// happen right after the current one finishes, using whatever the latest
// photos are by then. Because runs for the same warga never overlap, the
// final UPDATE always reflects the most recently *started* run's snapshot,
// which is taken after all earlier-queued uploads have already landed —
// this also closes the last-write-wins race that existed when every upload
// fired its own independent, unsequenced classification.
const classifyInFlight = new Set();
const reclassifyPending = new Set();

function scheduleKondisiClassification(wargaId) {
  if (classifyInFlight.has(wargaId)) {
    reclassifyPending.add(wargaId);
    return;
  }
  classifyInFlight.add(wargaId);
  runKondisiClassification(wargaId);
}

function runKondisiClassification(wargaId) {
  const finish = () => {
    classifyInFlight.delete(wargaId);
    if (reclassifyPending.delete(wargaId)) {
      classifyInFlight.add(wargaId);
      runKondisiClassification(wargaId);
    }
  };

  const latestPerJenis = db.prepare(`
    SELECT f.jenis, f.file_path FROM foto_rumah f
    WHERE f.warga_id = ? AND f.id = (
      SELECT MAX(id) FROM foto_rumah WHERE warga_id = f.warga_id AND jenis = f.jenis
    )
  `).all(wargaId).map((f) => ({ jenis: f.jenis, file_path: path.join(__dirname, '..', '..', 'uploads', f.file_path) }));

  if (latestPerJenis.length !== 3) {
    finish();
    return;
  }

  classifyKondisiRumah(latestPerJenis)
    .then((result) => {
      if (!result) return;
      db.prepare(
        'UPDATE data_administratif SET ai_kondisi_saran = ?, ai_kondisi_alasan = ? WHERE warga_id = ?'
      ).run(result.kondisi, result.alasan, wargaId);
    })
    .catch((err) => {
      console.error('[vlm] failed to update kondisi rumah advisory for warga', wargaId, '-', err.message);
    })
    .finally(finish);
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
    && KONDISI_RUMAH.includes(kondisi_rumah)
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

  // Fires whenever all 3 jenis exist (including on a re-upload after
  // completion, so a replaced photo gets a fresh classification) but never
  // more than one run in flight per warga — see scheduleKondisiClassification.
  scheduleKondisiClassification(wargaId);

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
