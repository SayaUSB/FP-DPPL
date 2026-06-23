/**
 * seed.js — SIBANSOS RT
 * Jalankan dari folder server: node seed.js
 */

const path = require('path');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'sibansos.sqlite');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// ---- Data warga ----
const WARGA_SEED = [
  { nama: 'Sumarni Wijaya',   nik: '3578014501780003', no_kk: '3578010987650001', alamat: 'Jl. Keputih Tegal Gg. III No. 12', pekerjaan: 'Buruh Cuci',         kategori_kerja: 'serabutan',    pendapatan: 950000,  tanggungan: 4, status_rumah: 'Menumpang',     kondisi_rumah: 'Tidak Layak',   validitas: 'menunggu',         catatan: '' },
  { nama: 'Bambang Setiawan', nik: '3578010203700005', no_kk: '3578010987650002', alamat: 'Jl. Keputih Tegal Gg. I No. 4',   pekerjaan: 'Tukang Bangunan',   kategori_kerja: 'serabutan',    pendapatan: 1600000, tanggungan: 3, status_rumah: 'Kontrak',        kondisi_rumah: 'Kurang Layak',  validitas: 'valid',            catatan: 'Data lengkap & terverifikasi RW.' },
  { nama: 'Aminah Lestari',   nik: '3578015503820009', no_kk: '3578010987650003', alamat: 'Jl. Keputih Gg. Makam No. 21',    pekerjaan: 'Tidak Bekerja',     kategori_kerja: 'tidak_bekerja',pendapatan: 600000,  tanggungan: 5, status_rumah: 'Menumpang',     kondisi_rumah: 'Tidak Layak',   validitas: 'menunggu',         catatan: '' },
  { nama: 'Hendra Gunawan',   nik: '3578012208680002', no_kk: '3578010987650004', alamat: 'Jl. Keputih Timur Jaya No. 8',    pekerjaan: 'Karyawan Swasta',   kategori_kerja: 'tetap',        pendapatan: 4200000, tanggungan: 2, status_rumah: 'Milik Sendiri', kondisi_rumah: 'Layak',         validitas: 'valid',            catatan: 'Pendapatan di atas garis kemiskinan.' },
  { nama: 'Siti Rohmah',      nik: '3578016012750006', no_kk: '3578010987650005', alamat: 'Jl. Keputih Tegal Timur No. 30',  pekerjaan: 'Pedagang Kecil',    kategori_kerja: 'serabutan',    pendapatan: 1350000, tanggungan: 4, status_rumah: 'Kontrak',        kondisi_rumah: 'Kurang Layak',  validitas: 'perlu_perbaikan',  catatan: 'Nomor KK belum sesuai, perlu diperbaiki.' },
  { nama: 'Joko Prasetyo',    nik: '3578011109650004', no_kk: '3578010987650006', alamat: 'Jl. Keputih Gg. II No. 17',       pekerjaan: 'Tukang Ojek',       kategori_kerja: 'serabutan',    pendapatan: 1800000, tanggungan: 3, status_rumah: 'Milik Sendiri', kondisi_rumah: 'Kurang Layak',  validitas: 'valid',            catatan: 'Memenuhi syarat, masuk daftar cadangan.' },
  { nama: 'Wati Susanti',     nik: '3578015704800007', no_kk: '3578010987650007', alamat: 'Jl. Keputih Tegal Gg. V No. 2',  pekerjaan: 'Asisten Rumah Tangga', kategori_kerja: 'serabutan', pendapatan: 1100000, tanggungan: 2, status_rumah: 'Kontrak',        kondisi_rumah: 'Kurang Layak',  validitas: 'menunggu',         catatan: '' },
  { nama: 'Rudi Hartono',     nik: '3578010801720008', no_kk: '3578010987650008', alamat: 'Jl. Keputih Timur No. 45',        pekerjaan: 'Wiraswasta',        kategori_kerja: 'tetap',        pendapatan: 3500000, tanggungan: 1, status_rumah: 'Milik Sendiri', kondisi_rumah: 'Layak',         validitas: 'valid',            catatan: 'Tidak memenuhi kriteria prioritas.' },
  { nama: 'Nurul Hidayah',    nik: '3578016305880010', no_kk: '3578010987650009', alamat: 'Jl. Keputih Gg. Masjid No. 9',   pekerjaan: 'Penjahit',          kategori_kerja: 'serabutan',    pendapatan: 1250000, tanggungan: 3, status_rumah: 'Menumpang',     kondisi_rumah: 'Kurang Layak',  validitas: 'menunggu',         catatan: '' },
  { nama: 'Slamet Riyadi',    nik: '3578011404600011', no_kk: '3578010987650010', alamat: 'Jl. Keputih Tegal Gg. IV No. 19',pekerjaan: 'Pensiunan',         kategori_kerja: 'tetap',        pendapatan: 1500000, tanggungan: 1, status_rumah: 'Milik Sendiri', kondisi_rumah: 'Kurang Layak',  validitas: 'valid',            catatan: 'Lansia, masuk pertimbangan cadangan.' },
  { nama: 'Dewi Anggraini',   nik: '3578015906900012', no_kk: '3578010987650011', alamat: 'Jl. Keputih Timur Jaya No. 22',  pekerjaan: 'Buruh Pabrik',      kategori_kerja: 'tetap',        pendapatan: 2400000, tanggungan: 2, status_rumah: 'Kontrak',        kondisi_rumah: 'Layak',         validitas: 'valid',            catatan: '' },
  { nama: 'Agus Salim',       nik: '3578010907660013', no_kk: '3578010987650012', alamat: 'Jl. Keputih Gg. III No. 5',      pekerjaan: 'Tidak Bekerja',     kategori_kerja: 'tidak_bekerja',pendapatan: 750000,  tanggungan: 4, status_rumah: 'Menumpang',     kondisi_rumah: 'Tidak Layak',   validitas: 'menunggu',         catatan: '' },
  { nama: 'Endang Sulastri',  nik: '3578015201850014', no_kk: '3578010987650013', alamat: 'Jl. Keputih Tegal Gg. II No. 28',pekerjaan: 'Pedagang Sayur',    kategori_kerja: 'serabutan',    pendapatan: 1450000, tanggungan: 3, status_rumah: 'Kontrak',        kondisi_rumah: 'Kurang Layak',  validitas: 'perlu_perbaikan',  catatan: 'Foto KTP buram, mohon unggah ulang.' },
  { nama: 'Mariyono',         nik: '3578011712580015', no_kk: '3578010987650014', alamat: 'Jl. Keputih Timur No. 51',        pekerjaan: 'Buruh Tani',        kategori_kerja: 'serabutan',    pendapatan: 1000000, tanggungan: 5, status_rumah: 'Menumpang',     kondisi_rumah: 'Tidak Layak',   validitas: 'menunggu',         catatan: '' },
];

// ---- Hitung skor prioritas (sama dengan logika di data.js) ----
function skorPrioritas(w) {
  const perKapita = w.pendapatan / (w.tanggungan + 1);
  let inc = (1.5e6 - perKapita) / (1.5e6 - 300000);
  inc = Math.max(0, Math.min(1, inc));
  const incomeScore = inc * 40;
  const tanggunganScore = Math.min(w.tanggungan, 6) / 6 * 20;
  const rumahMap = { 'Tidak Layak': 22, 'Kurang Layak': 13, 'Layak': 4 };
  const statusMap = { 'Menumpang': 10, 'Kontrak': 7, 'Milik Sendiri': 3 };
  const kerjaMap = { 'tidak_bekerja': 8, 'serabutan': 6, 'tetap': 2 };
  return Math.round(
    incomeScore +
    tanggunganScore +
    (rumahMap[w.kondisi_rumah] ?? 4) +
    (statusMap[w.status_rumah] ?? 3) +
    (kerjaMap[w.kategori_kerja] ?? 4)
  );
}

// ---- Kelengkapan default (semua true kecuali yang di catatan) ----
function kelengkapan(w) {
  // Siti Rohmah: KK bermasalah
  if (w.nik === '3578016012750006') return { ktp: 1, kk: 0, pendapatan: 1, foto: 1 };
  // Endang Sulastri: KTP bermasalah
  if (w.nik === '3578015201850014') return { ktp: 0, kk: 1, pendapatan: 1, foto: 1 };
  // Wati Susanti: foto belum ada
  if (w.nik === '3578015704800007') return { ktp: 1, kk: 1, pendapatan: 1, foto: 0 };
  // Nurul Hidayah: pendapatan belum ada
  if (w.nik === '3578016305880010') return { ktp: 1, kk: 1, pendapatan: 0, foto: 1 };
  return { ktp: 1, kk: 1, pendapatan: 1, foto: 1 };
}

// ---- Status bantuan per warga (dari data.js) ----
const statusBantuanMap = {
  '3578010203700005': 'penerima',   // Bambang
  '3578011109650004': 'cadangan',   // Joko
  '3578011404600011': 'cadangan',   // Slamet
  '3578012208680002': 'bukan',      // Hendra
  '3578010801720008': 'bukan',      // Rudi
  '3578015906900012': 'bukan',      // Dewi
};

// ---- Insert ----
const insertWarga = db.prepare(`
  INSERT OR IGNORE INTO warga (nama, nik, no_kk, alamat)
  VALUES (@nama, @nik, @no_kk, @alamat)
`);

const insertDataAdmin = db.prepare(`
  INSERT OR REPLACE INTO data_administratif
    (warga_id, kategori_kerja, pekerjaan, pendapatan, tanggungan,
     status_rumah, kondisi_rumah, skor_prioritas, validitas, catatan_verifikasi,
     chk_ktp, chk_kk, chk_pendapatan, chk_foto)
  VALUES
    (@warga_id, @kategori_kerja, @pekerjaan, @pendapatan, @tanggungan,
     @status_rumah, @kondisi_rumah, @skor_prioritas, @validitas, @catatan_verifikasi,
     @chk_ktp, @chk_kk, @chk_pendapatan, @chk_foto)
`);

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (role, username, password_hash, warga_id)
  VALUES (@role, @username, @password_hash, @warga_id)
`);

const getWargaByNik = db.prepare(`SELECT id FROM warga WHERE nik = ?`);

// Cek apakah sudah ada bantuan aktif, kalau belum buat satu
let bantuan = db.prepare(`SELECT id FROM bantuan WHERE is_active = 1 LIMIT 1`).get();
if (!bantuan) {
  db.prepare(`
    INSERT INTO bantuan (nama_bantuan, jenis_bantuan, kuota, nominal, periode, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run('Bantuan Sosial Tunai', 'tunai', 5, 600000, 'Triwulan II 2026');
  bantuan = db.prepare(`SELECT id FROM bantuan WHERE is_active = 1 LIMIT 1`).get();
}

const insertHasilSeleksi = db.prepare(`
  INSERT OR IGNORE INTO hasil_seleksi (warga_id, bantuan_id, skor_prioritas, status)
  VALUES (@warga_id, @bantuan_id, @skor_prioritas, @status)
`);

// ---- Jalankan semua dalam satu transaksi ----
const runSeed = db.transaction(() => {
  for (const w of WARGA_SEED) {
    // Insert ke tabel warga
    insertWarga.run({ nama: w.nama, nik: w.nik, no_kk: w.no_kk, alamat: w.alamat });

    const row = getWargaByNik.get(w.nik);
    if (!row) continue;
    const warga_id = row.id;

    const skor = skorPrioritas(w);
    const kl = kelengkapan(w);

    // Insert data administratif
    insertDataAdmin.run({
      warga_id,
      kategori_kerja: w.kategori_kerja,
      pekerjaan: w.pekerjaan,
      pendapatan: w.pendapatan,
      tanggungan: w.tanggungan,
      status_rumah: w.status_rumah,
      kondisi_rumah: w.kondisi_rumah,
      skor_prioritas: skor,
      validitas: w.validitas,
      catatan_verifikasi: w.catatan || null,
      chk_ktp: kl.ktp,
      chk_kk: kl.kk,
      chk_pendapatan: kl.pendapatan,
      chk_foto: kl.foto,
    });

    // Insert hasil seleksi jika ada status bantuan
    const statusBantuan = statusBantuanMap[w.nik] || 'menunggu';
    insertHasilSeleksi.run({
      warga_id,
      bantuan_id: bantuan.id,
      skor_prioritas: skor,
      status: statusBantuan,
    });

    // Buat akun warga (username = 3 huruf nama pertama + 4 digit nik terakhir)
    const username = w.nama.split(' ')[0].toLowerCase().slice(0, 3) + w.nik.slice(-4);
    const password_hash = bcrypt.hashSync('warga123', 10);
    insertUser.run({ role: 'warga', username, password_hash, warga_id });

    console.log(`✓ ${w.nama} (skor: ${skor}) — username: ${username}`);
  }
});

runSeed();
console.log('\n✅ Seed selesai! Semua warga berhasil dimasukkan.');
console.log('   Login admin  → username: pengurus   password: pengurus123');
console.log('   Login warga  → username: [nama]     password: warga123');