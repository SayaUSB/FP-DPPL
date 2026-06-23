/**
 * seed.js — SIBANSOS RT
 *
 * Mengisi database dengan data warga dummy yang realistis supaya semua halaman
 * Pengurus RT (statistik, verifikasi, seleksi, riwayat) langsung terisi tanpa
 * perlu mendaftarkan warga satu per satu lewat UI.
 *
 * Jalankan dari folder server:  npm run seed   (atau: node seed.js)
 *
 * Catatan penting:
 *  - Script ini require('./src/db'), jadi skema tabel + akun admin otomatis
 *    dibuat. Tidak perlu menjalankan server lebih dulu — aman di fresh clone.
 *  - Skor prioritas dihitung lewat ./src/scoring (sumber kebenaran yang sama
 *    dengan aplikasi), jadi tidak ada logika skor yang disalin & berisiko beda.
 *  - Idempotent: setiap dijalankan, data warga lama dihapus lalu diisi ulang.
 *    Akun admin (pengurus) TIDAK ikut terhapus.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./src/db');
const { hitungSkor } = require('./src/scoring');

// ---- Foto placeholder --------------------------------------------------
// Satu gambar placeholder dipakai bersama semua warga, hanya agar fitur foto
// & checklist verifikasi punya file yang benar-benar ada di disk.
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PLACEHOLDER_NAME = 'seed-rumah-placeholder.png';

function ensurePlaceholderFoto() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const target = path.join(UPLOADS_DIR, PLACEHOLDER_NAME);
  if (fs.existsSync(target)) return;
  const onePxPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(target, onePxPng);
}

// ---- Data warga (alamat realistis area Keputih, Surabaya) ---------------
const WARGA_SEED = [
  { nama: 'Sumarni Wijaya',   nik: '3578014501780003', no_kk: '3578010987650001', alamat: 'Jl. Keputih Tegal Gg. III No. 12', pekerjaan: 'Buruh Cuci',          kategori_kerja: 'serabutan',     pendapatan: 950000,  tanggungan: 4, status_rumah: 'Menumpang',     kondisi_rumah: 'Tidak Layak',  validitas: 'menunggu',        catatan: '' },
  { nama: 'Bambang Setiawan', nik: '3578010203700005', no_kk: '3578010987650002', alamat: 'Jl. Keputih Tegal Gg. I No. 4',    pekerjaan: 'Tukang Bangunan',    kategori_kerja: 'serabutan',     pendapatan: 1600000, tanggungan: 3, status_rumah: 'Kontrak',        kondisi_rumah: 'Kurang Layak', validitas: 'valid',           catatan: 'Data lengkap & terverifikasi RW.' },
  { nama: 'Aminah Lestari',   nik: '3578015503820009', no_kk: '3578010987650003', alamat: 'Jl. Keputih Gg. Makam No. 21',     pekerjaan: 'Tidak Bekerja',      kategori_kerja: 'tidak_bekerja', pendapatan: 600000,  tanggungan: 5, status_rumah: 'Menumpang',     kondisi_rumah: 'Tidak Layak',  validitas: 'menunggu',        catatan: '' },
  { nama: 'Hendra Gunawan',   nik: '3578012208680002', no_kk: '3578010987650004', alamat: 'Jl. Keputih Timur Jaya No. 8',     pekerjaan: 'Karyawan Swasta',    kategori_kerja: 'tetap',         pendapatan: 4200000, tanggungan: 2, status_rumah: 'Milik Sendiri', kondisi_rumah: 'Layak',        validitas: 'valid',           catatan: 'Pendapatan di atas garis kemiskinan.' },
  { nama: 'Siti Rohmah',      nik: '3578016012750006', no_kk: '3578010987650005', alamat: 'Jl. Keputih Tegal Timur No. 30',   pekerjaan: 'Pedagang Kecil',     kategori_kerja: 'serabutan',     pendapatan: 1350000, tanggungan: 4, status_rumah: 'Kontrak',        kondisi_rumah: 'Kurang Layak', validitas: 'perlu_perbaikan', catatan: 'Nomor KK belum sesuai, perlu diperbaiki.' },
  { nama: 'Joko Prasetyo',    nik: '3578011109650004', no_kk: '3578010987650006', alamat: 'Jl. Keputih Gg. II No. 17',        pekerjaan: 'Tukang Ojek',        kategori_kerja: 'serabutan',     pendapatan: 1800000, tanggungan: 3, status_rumah: 'Milik Sendiri', kondisi_rumah: 'Kurang Layak', validitas: 'valid',           catatan: 'Memenuhi syarat, masuk daftar cadangan.' },
  { nama: 'Wati Susanti',     nik: '3578015704800007', no_kk: '3578010987650007', alamat: 'Jl. Keputih Tegal Gg. V No. 2',   pekerjaan: 'Asisten Rumah Tangga', kategori_kerja: 'serabutan',   pendapatan: 1100000, tanggungan: 2, status_rumah: 'Kontrak',        kondisi_rumah: 'Kurang Layak', validitas: 'menunggu',        catatan: '' },
  { nama: 'Rudi Hartono',     nik: '3578010801720008', no_kk: '3578010987650008', alamat: 'Jl. Keputih Timur No. 45',         pekerjaan: 'Wiraswasta',         kategori_kerja: 'tetap',         pendapatan: 3500000, tanggungan: 1, status_rumah: 'Milik Sendiri', kondisi_rumah: 'Layak',        validitas: 'valid',           catatan: 'Tidak memenuhi kriteria prioritas.' },
  { nama: 'Nurul Hidayah',    nik: '3578016305880010', no_kk: '3578010987650009', alamat: 'Jl. Keputih Gg. Masjid No. 9',    pekerjaan: 'Penjahit',           kategori_kerja: 'serabutan',     pendapatan: 1250000, tanggungan: 3, status_rumah: 'Menumpang',     kondisi_rumah: 'Kurang Layak', validitas: 'menunggu',        catatan: '' },
  { nama: 'Slamet Riyadi',    nik: '3578011404600011', no_kk: '3578010987650010', alamat: 'Jl. Keputih Tegal Gg. IV No. 19', pekerjaan: 'Pensiunan',          kategori_kerja: 'tetap',         pendapatan: 1500000, tanggungan: 1, status_rumah: 'Milik Sendiri', kondisi_rumah: 'Kurang Layak', validitas: 'valid',           catatan: 'Lansia, masuk pertimbangan cadangan.' },
  { nama: 'Dewi Anggraini',   nik: '3578015906900012', no_kk: '3578010987650011', alamat: 'Jl. Keputih Timur Jaya No. 22',   pekerjaan: 'Buruh Pabrik',       kategori_kerja: 'tetap',         pendapatan: 2400000, tanggungan: 2, status_rumah: 'Kontrak',        kondisi_rumah: 'Layak',        validitas: 'valid',           catatan: '' },
  { nama: 'Agus Salim',       nik: '3578010907660013', no_kk: '3578010987650012', alamat: 'Jl. Keputih Gg. III No. 5',       pekerjaan: 'Tidak Bekerja',      kategori_kerja: 'tidak_bekerja', pendapatan: 750000,  tanggungan: 4, status_rumah: 'Menumpang',     kondisi_rumah: 'Tidak Layak',  validitas: 'menunggu',        catatan: '' },
  { nama: 'Endang Sulastri',  nik: '3578015201850014', no_kk: '3578010987650013', alamat: 'Jl. Keputih Tegal Gg. II No. 28', pekerjaan: 'Pedagang Sayur',     kategori_kerja: 'serabutan',     pendapatan: 1450000, tanggungan: 3, status_rumah: 'Kontrak',        kondisi_rumah: 'Kurang Layak', validitas: 'perlu_perbaikan', catatan: 'Foto KTP buram, mohon unggah ulang.' },
  { nama: 'Mariyono',         nik: '3578011712580015', no_kk: '3578010987650014', alamat: 'Jl. Keputih Timur No. 51',         pekerjaan: 'Buruh Tani',         kategori_kerja: 'serabutan',     pendapatan: 1000000, tanggungan: 5, status_rumah: 'Menumpang',     kondisi_rumah: 'Tidak Layak',  validitas: 'menunggu',        catatan: '' },
];

// ---- Kelengkapan checklist (default lengkap kecuali kasus tertentu) ------
function kelengkapan(w) {
  if (w.nik === '3578016012750006') return { ktp: 1, kk: 0, pendapatan: 1, foto: 1 }; // Siti: KK bermasalah
  if (w.nik === '3578015201850014') return { ktp: 0, kk: 1, pendapatan: 1, foto: 1 }; // Endang: KTP bermasalah
  if (w.nik === '3578015704800007') return { ktp: 1, kk: 1, pendapatan: 1, foto: 0 }; // Wati: foto belum ada
  if (w.nik === '3578016305880010') return { ktp: 1, kk: 1, pendapatan: 0, foto: 1 }; // Nurul: pendapatan belum ada
  return { ktp: 1, kk: 1, pendapatan: 1, foto: 1 };
}

// ---- Status seleksi periode aktif (ditetapkan manual oleh RT) ------------
const statusAktifMap = {
  '3578010203700005': 'penerima',   // Bambang
  '3578011109650004': 'cadangan',   // Joko
  '3578011404600011': 'cadangan',   // Slamet
  '3578012208680002': 'bukan',      // Hendra
  '3578010801720008': 'bukan',      // Rudi
  '3578015906900012': 'bukan',      // Dewi
};

// ---- Prepared statements ------------------------------------------------
const insertWarga = db.prepare(
  'INSERT INTO warga (nama, nik, no_kk, alamat) VALUES (@nama, @nik, @no_kk, @alamat)'
);
const insertDataAdmin = db.prepare(`
  INSERT INTO data_administratif
    (warga_id, kategori_kerja, pekerjaan, pendapatan, tanggungan,
     status_rumah, kondisi_rumah, skor_prioritas, validitas, catatan_verifikasi,
     chk_ktp, chk_kk, chk_pendapatan, chk_foto)
  VALUES
    (@warga_id, @kategori_kerja, @pekerjaan, @pendapatan, @tanggungan,
     @status_rumah, @kondisi_rumah, @skor_prioritas, @validitas, @catatan_verifikasi,
     @chk_ktp, @chk_kk, @chk_pendapatan, @chk_foto)
`);
const insertUser = db.prepare(
  "INSERT INTO users (role, username, password_hash, warga_id) VALUES ('warga', @username, @password_hash, @warga_id)"
);
const insertFoto = db.prepare(
  'INSERT INTO foto_rumah (warga_id, jenis, file_path, deskripsi) VALUES (?, ?, ?, ?)'
);
const insertBantuan = db.prepare(`
  INSERT INTO bantuan (nama_bantuan, jenis_bantuan, kuota, nominal, periode, is_active)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertSeleksi = db.prepare(
  'INSERT INTO hasil_seleksi (warga_id, bantuan_id, skor_prioritas, status) VALUES (?, ?, ?, ?)'
);

function run() {
  ensurePlaceholderFoto();
  const passwordHash = bcrypt.hashSync('warga123', 10);

  const seed = db.transaction(() => {
    // Reset data warga lama (urutan menghormati foreign key). Admin tetap aman.
    db.prepare('DELETE FROM notifications').run();
    db.prepare('DELETE FROM hasil_seleksi').run();
    db.prepare('DELETE FROM foto_rumah').run();
    db.prepare('DELETE FROM data_administratif').run();
    db.prepare("DELETE FROM users WHERE role = 'warga'").run();
    db.prepare('DELETE FROM warga').run();
    db.prepare('DELETE FROM bantuan').run();

    const warga = []; // { id, nik, skor }

    for (const w of WARGA_SEED) {
      const { lastInsertRowid: wargaId } = insertWarga.run({
        nama: w.nama, nik: w.nik, no_kk: w.no_kk, alamat: w.alamat,
      });

      const skor = hitungSkor({
        pendapatan: w.pendapatan, tanggungan: w.tanggungan, kondisiRumah: w.kondisi_rumah,
        statusRumah: w.status_rumah, kategoriKerja: w.kategori_kerja,
      });
      const kl = kelengkapan(w);

      insertDataAdmin.run({
        warga_id: wargaId,
        kategori_kerja: w.kategori_kerja, pekerjaan: w.pekerjaan,
        pendapatan: w.pendapatan, tanggungan: w.tanggungan,
        status_rumah: w.status_rumah, kondisi_rumah: w.kondisi_rumah,
        skor_prioritas: skor, validitas: w.validitas, catatan_verifikasi: w.catatan || null,
        chk_ktp: kl.ktp, chk_kk: kl.kk, chk_pendapatan: kl.pendapatan, chk_foto: kl.foto,
      });

      // Akun login warga: 3 huruf depan nama + 4 digit akhir NIK (skema tim).
      const username = w.nama.split(' ')[0].toLowerCase().slice(0, 3) + w.nik.slice(-4);
      insertUser.run({ username, password_hash: passwordHash, warga_id: wargaId });

      // Foto rumah placeholder (kecuali yang sengaja ditandai belum ada foto).
      if (kl.foto) {
        for (const jenis of ['eksterior', 'interior', 'lingkungan']) {
          insertFoto.run(wargaId, jenis, PLACEHOLDER_NAME, `Foto ${jenis} rumah (placeholder)`);
        }
      }

      warga.push({ id: wargaId, nik: w.nik, skor });
    }

    // --- Periode bantuan ---------------------------------------------
    // Periode LAMA (riwayat) + periode AKTIF.
    const bySkorDesc = [...warga].sort((a, b) => b.skor - a.skor);

    // Riwayat: Triwulan I 2026 (selesai). Penerima = peringkat teratas sesuai kuota.
    const { lastInsertRowid: lamaId } = insertBantuan.run(
      'Bantuan Sosial Tunai', 'tunai', 5, 600000, 'Triwulan I 2026', 0
    );
    bySkorDesc.forEach((w, idx) => {
      let status = 'bukan';
      if (idx < 5) status = 'penerima';
      else if (idx < 8) status = 'cadangan';
      insertSeleksi.run(w.id, lamaId, w.skor, status);
    });

    // Aktif: Triwulan II 2026 (kuota 5). Status sebagian ditetapkan manual,
    // sisanya 'menunggu' keputusan RT.
    const { lastInsertRowid: aktifId } = insertBantuan.run(
      'Bantuan Sosial Tunai', 'tunai', 5, 600000, 'Triwulan II 2026', 1
    );
    for (const w of warga) {
      const status = statusAktifMap[w.nik] || 'menunggu';
      insertSeleksi.run(w.id, aktifId, w.skor, status);
    }
  });

  seed();

  // --- Ringkasan -------------------------------------------------------
  const total = db.prepare('SELECT COUNT(*) AS c FROM warga').get().c;
  const valid = db.prepare("SELECT COUNT(*) AS c FROM data_administratif WHERE validitas = 'valid'").get().c;
  const foto = db.prepare('SELECT COUNT(*) AS c FROM foto_rumah').get().c;
  console.log('✅ Seed selesai.');
  console.log(`   • ${total} warga (login: username + password "warga123")`);
  console.log(`   • ${valid} warga valid · ${foto} foto rumah`);
  console.log('   • Periode aktif: Bantuan Sosial Tunai Triwulan II 2026 (kuota 5)');
  console.log('   • Riwayat: Bantuan Sosial Tunai Triwulan I 2026');
  console.log('   • Admin login: pengurus / pengurus123');
}

run();
