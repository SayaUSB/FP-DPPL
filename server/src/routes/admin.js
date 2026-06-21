const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { hitungSkor, tingkatPrioritas } = require('../scoring');

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

module.exports = router;
