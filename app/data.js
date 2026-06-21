/* ============================================================
   SIBANSOS RT — Data dummy & Mesin Penentuan Prioritas
   Lingkup: RT 03 / RW 05, Kel. Keputih, Kec. Sukolilo, Surabaya
   ============================================================ */
(function () {
  // ---- Formatters ----
  const fmtRupiah = (n) =>
    'Rp ' + (n || 0).toLocaleString('id-ID');
  const fmtRupiahShort = (n) => {
    if (n >= 1000000) return 'Rp ' + (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + ' jt';
    if (n >= 1000) return 'Rp ' + Math.round(n / 1000) + 'rb';
    return 'Rp ' + n;
  };
  const inisial = (nama) => nama.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();

  // Deterministic color per name (gov-blue family)
  const avatarColors = [
    'oklch(0.52 0.14 255)', 'oklch(0.50 0.10 220)', 'oklch(0.48 0.11 285)',
    'oklch(0.54 0.10 200)', 'oklch(0.50 0.12 265)', 'oklch(0.52 0.09 235)',
  ];
  const avatarColor = (id) => avatarColors[id % avatarColors.length];

  // ---- Master data warga (kepala keluarga) ----
  // pendapatan = pendapatan keluarga / bulan (Rp)
  const WARGA_SEED = [
    { id: 1, nama: 'Sumarni Wijaya', nik: '3578014501780003', noKK: '3578010987650001', alamat: 'Jl. Keputih Tegal Gg. III No. 12', pekerjaan: 'Buruh Cuci', kategoriKerja: 'serabutan', pendapatan: 950000, tanggungan: 4, statusRumah: 'Menumpang', kondisiRumah: 'Tidak Layak', tanggal: '2026-05-12', validitas: 'menunggu', statusBantuan: 'menunggu', kelengkapan: { ktp: true, kk: true, foto: true, pendapatan: true }, catatan: '' },
    { id: 2, nama: 'Bambang Setiawan', nik: '3578010203700005', noKK: '3578010987650002', alamat: 'Jl. Keputih Tegal Gg. I No. 4', pekerjaan: 'Tukang Bangunan', kategoriKerja: 'serabutan', pendapatan: 1600000, tanggungan: 3, statusRumah: 'Kontrak', kondisiRumah: 'Kurang Layak', tanggal: '2026-05-10', validitas: 'valid', statusBantuan: 'penerima', kelengkapan: { ktp: true, kk: true, foto: true, pendapatan: true }, catatan: 'Data lengkap & terverifikasi RW.' },
    { id: 3, nama: 'Aminah Lestari', nik: '3578015503820009', noKK: '3578010987650003', alamat: 'Jl. Keputih Gg. Makam No. 21', pekerjaan: 'Tidak Bekerja', kategoriKerja: 'tidak_bekerja', pendapatan: 600000, tanggungan: 5, statusRumah: 'Menumpang', kondisiRumah: 'Tidak Layak', tanggal: '2026-05-13', validitas: 'menunggu', statusBantuan: 'menunggu', kelengkapan: { ktp: true, kk: true, foto: true, pendapatan: true }, catatan: '' },
    { id: 4, nama: 'Hendra Gunawan', nik: '3578012208680002', noKK: '3578010987650004', alamat: 'Jl. Keputih Timur Jaya No. 8', pekerjaan: 'Karyawan Swasta', kategoriKerja: 'tetap', pendapatan: 4200000, tanggungan: 2, statusRumah: 'Milik Sendiri', kondisiRumah: 'Layak', tanggal: '2026-05-09', validitas: 'valid', statusBantuan: 'bukan', kelengkapan: { ktp: true, kk: true, foto: true, pendapatan: true }, catatan: 'Pendapatan di atas garis kemiskinan.' },
    { id: 5, nama: 'Siti Rohmah', nik: '3578016012750006', noKK: '3578010987650005', alamat: 'Jl. Keputih Tegal Timur No. 30', pekerjaan: 'Pedagang Kecil', kategoriKerja: 'serabutan', pendapatan: 1350000, tanggungan: 4, statusRumah: 'Kontrak', kondisiRumah: 'Kurang Layak', tanggal: '2026-05-11', validitas: 'perlu_perbaikan', statusBantuan: 'menunggu', kelengkapan: { ktp: true, kk: false, foto: true, pendapatan: true }, catatan: 'Nomor KK belum sesuai, perlu diperbaiki.' },
    { id: 6, nama: 'Joko Prasetyo', nik: '3578011109650004', noKK: '3578010987650006', alamat: 'Jl. Keputih Gg. II No. 17', pekerjaan: 'Tukang Ojek', kategoriKerja: 'serabutan', pendapatan: 1800000, tanggungan: 3, statusRumah: 'Milik Sendiri', kondisiRumah: 'Kurang Layak', tanggal: '2026-05-08', validitas: 'valid', statusBantuan: 'cadangan', kelengkapan: { ktp: true, kk: true, foto: true, pendapatan: true }, catatan: 'Memenuhi syarat, masuk daftar cadangan.' },
    { id: 7, nama: 'Wati Susanti', nik: '3578015704800007', noKK: '3578010987650007', alamat: 'Jl. Keputih Tegal Gg. V No. 2', pekerjaan: 'Asisten Rumah Tangga', kategoriKerja: 'serabutan', pendapatan: 1100000, tanggungan: 2, statusRumah: 'Kontrak', kondisiRumah: 'Kurang Layak', tanggal: '2026-05-14', validitas: 'menunggu', statusBantuan: 'menunggu', kelengkapan: { ktp: true, kk: true, foto: false, pendapatan: true }, catatan: '' },
    { id: 8, nama: 'Rudi Hartono', nik: '3578010801720008', noKK: '3578010987650008', alamat: 'Jl. Keputih Timur No. 45', pekerjaan: 'Wiraswasta', kategoriKerja: 'tetap', pendapatan: 3500000, tanggungan: 1, statusRumah: 'Milik Sendiri', kondisiRumah: 'Layak', tanggal: '2026-05-07', validitas: 'valid', statusBantuan: 'bukan', kelengkapan: { ktp: true, kk: true, foto: true, pendapatan: true }, catatan: 'Tidak memenuhi kriteria prioritas.' },
    { id: 9, nama: 'Nurul Hidayah', nik: '3578016305880010', noKK: '3578010987650009', alamat: 'Jl. Keputih Gg. Masjid No. 9', pekerjaan: 'Penjahit', kategoriKerja: 'serabutan', pendapatan: 1250000, tanggungan: 3, statusRumah: 'Menumpang', kondisiRumah: 'Kurang Layak', tanggal: '2026-05-12', validitas: 'menunggu', statusBantuan: 'menunggu', kelengkapan: { ktp: true, kk: true, foto: true, pendapatan: false }, catatan: '' },
    { id: 10, nama: 'Slamet Riyadi', nik: '3578011404600011', noKK: '3578010987650010', alamat: 'Jl. Keputih Tegal Gg. IV No. 19', pekerjaan: 'Pensiunan', kategoriKerja: 'tetap', pendapatan: 1500000, tanggungan: 1, statusRumah: 'Milik Sendiri', kondisiRumah: 'Kurang Layak', tanggal: '2026-05-06', validitas: 'valid', statusBantuan: 'cadangan', kelengkapan: { ktp: true, kk: true, foto: true, pendapatan: true }, catatan: 'Lansia, masuk pertimbangan cadangan.' },
    { id: 11, nama: 'Dewi Anggraini', nik: '3578015906900012', noKK: '3578010987650011', alamat: 'Jl. Keputih Timur Jaya No. 22', pekerjaan: 'Buruh Pabrik', kategoriKerja: 'tetap', pendapatan: 2400000, tanggungan: 2, statusRumah: 'Kontrak', kondisiRumah: 'Layak', tanggal: '2026-05-10', validitas: 'valid', statusBantuan: 'bukan', kelengkapan: { ktp: true, kk: true, foto: true, pendapatan: true }, catatan: '' },
    { id: 12, nama: 'Agus Salim', nik: '3578010907660013', noKK: '3578010987650012', alamat: 'Jl. Keputih Gg. III No. 5', pekerjaan: 'Tidak Bekerja', kategoriKerja: 'tidak_bekerja', pendapatan: 750000, tanggungan: 4, statusRumah: 'Menumpang', kondisiRumah: 'Tidak Layak', tanggal: '2026-05-13', validitas: 'menunggu', statusBantuan: 'menunggu', kelengkapan: { ktp: true, kk: true, foto: true, pendapatan: true }, catatan: '' },
    { id: 13, nama: 'Endang Sulastri', nik: '3578015201850014', noKK: '3578010987650013', alamat: 'Jl. Keputih Tegal Gg. II No. 28', pekerjaan: 'Pedagang Sayur', kategoriKerja: 'serabutan', pendapatan: 1450000, tanggungan: 3, statusRumah: 'Kontrak', kondisiRumah: 'Kurang Layak', tanggal: '2026-05-11', validitas: 'perlu_perbaikan', statusBantuan: 'menunggu', kelengkapan: { ktp: false, kk: true, foto: true, pendapatan: true }, catatan: 'Foto KTP buram, mohon unggah ulang.' },
    { id: 14, nama: 'Mariyono', nik: '3578011712580015', noKK: '3578010987650014', alamat: 'Jl. Keputih Timur No. 51', pekerjaan: 'Buruh Tani', kategoriKerja: 'serabutan', pendapatan: 1000000, tanggungan: 5, statusRumah: 'Menumpang', kondisiRumah: 'Tidak Layak', tanggal: '2026-05-09', validitas: 'menunggu', statusBantuan: 'menunggu', kelengkapan: { ktp: true, kk: true, foto: true, pendapatan: true }, catatan: '' },
  ];

  // ---- Mesin Penentuan Prioritas (simulasi Asisten AI) ----
  // Deterministik & transparan; slot ini dapat digantikan output LLM lokal.
  // Bobot total 100: pendapatan/kapita (40) · tanggungan (20) · kondisi rumah (22) · status rumah (10) · pekerjaan (8)
  function faktorPrioritas(w) {
    const perKapita = w.pendapatan / (w.tanggungan + 1);
    // Income per capita: <=300rb -> penuh, >=1.5jt -> 0
    let inc = (1.5e6 - perKapita) / (1.5e6 - 300000);
    inc = Math.max(0, Math.min(1, inc));
    const incomeScore = +(inc * 40).toFixed(1);

    const tanggunganScore = +(Math.min(w.tanggungan, 6) / 6 * 20).toFixed(1);

    const rumahMap = { 'Tidak Layak': 22, 'Kurang Layak': 13, 'Layak': 4 };
    const rumahScore = rumahMap[w.kondisiRumah] ?? 4;

    const statusMap = { 'Menumpang': 10, 'Kontrak': 7, 'Milik Sendiri': 3 };
    const statusScore = statusMap[w.statusRumah] ?? 3;

    const kerjaMap = { 'tidak_bekerja': 8, 'serabutan': 6, 'tetap': 2 };
    const kerjaScore = kerjaMap[w.kategoriKerja] ?? 4;

    return {
      perKapita,
      faktor: [
        { nama: 'Pendapatan per kapita', nilai: incomeScore, max: 40, ket: fmtRupiah(Math.round(perKapita)) + ' / org' },
        { nama: 'Jumlah tanggungan', nilai: tanggunganScore, max: 20, ket: w.tanggungan + ' orang' },
        { nama: 'Kondisi rumah', nilai: rumahScore, max: 22, ket: w.kondisiRumah },
        { nama: 'Status kepemilikan', nilai: statusScore, max: 10, ket: w.statusRumah },
        { nama: 'Stabilitas pekerjaan', nilai: kerjaScore, max: 8, ket: w.pekerjaan },
      ],
    };
  }

  function skorPrioritas(w) {
    const { faktor } = faktorPrioritas(w);
    return Math.round(faktor.reduce((s, f) => s + f.nilai, 0));
  }

  function tingkatPrioritas(skor) {
    if (skor >= 70) return { label: 'Sangat Tinggi', tone: 'red' };
    if (skor >= 55) return { label: 'Tinggi', tone: 'amber' };
    if (skor >= 40) return { label: 'Sedang', tone: 'blue' };
    return { label: 'Rendah', tone: 'gray' };
  }

  // Rekomendasi naratif (simulasi keluaran LLM lokal)
  function rekomendasiAI(w) {
    const skor = skorPrioritas(w);
    const t = tingkatPrioritas(skor);
    const { perKapita } = faktorPrioritas(w);
    const perKapitaTeks = fmtRupiah(Math.round(perKapita));
    const garis = 600000; // ambang per kapita acuan
    let saran, alasan = [];

    if (perKapita < garis) alasan.push(`pendapatan per kapita ${perKapitaTeks}/bulan berada di bawah ambang kelayakan`);
    else alasan.push(`pendapatan per kapita ${perKapitaTeks}/bulan`);
    if (w.tanggungan >= 4) alasan.push(`menanggung ${w.tanggungan} jiwa`);
    if (w.kondisiRumah === 'Tidak Layak') alasan.push('kondisi rumah tidak layak huni');
    else if (w.kondisiRumah === 'Kurang Layak') alasan.push('kondisi rumah kurang layak');
    if (w.statusRumah === 'Menumpang') alasan.push('belum memiliki tempat tinggal sendiri');

    if (skor >= 70) saran = 'Direkomendasikan sebagai PENERIMA prioritas utama.';
    else if (skor >= 55) saran = 'Layak dipertimbangkan sebagai penerima bantuan.';
    else if (skor >= 40) saran = 'Dapat dimasukkan ke daftar cadangan bila kuota tersedia.';
    else saran = 'Belum memenuhi ambang prioritas untuk periode ini.';

    return {
      skor, tingkat: t,
      teks: `Berdasarkan analisis data, warga ini memiliki skor prioritas ${skor}/100 (kategori ${t.label}). Pertimbangan utama: ${alasan.join(', ')}. ${saran}`,
    };
  }

  function kelengkapanScore(w) {
    const v = Object.values(w.kelengkapan);
    return { ok: v.filter(Boolean).length, total: v.length };
  }

  // ---- Konfigurasi periode & kuota (F01 sebagai konteks F10) ----
  const KONFIG = {
    rt: 'RT 03 / RW 05',
    kelurahan: 'Kel. Keputih, Kec. Sukolilo',
    kota: 'Kota Surabaya',
    periode: 'Bantuan Sosial Tunai — Triwulan II 2026',
    kuota: 5,
    nominal: 600000,
  };

  window.SIB = {
    fmtRupiah, fmtRupiahShort, inisial, avatarColor,
    WARGA_SEED, KONFIG,
    faktorPrioritas, skorPrioritas, tingkatPrioritas, rekomendasiAI, kelengkapanScore,
    validitasMeta: {
      valid: { label: 'Valid', tone: 'green' },
      menunggu: { label: 'Menunggu', tone: 'amber' },
      perlu_perbaikan: { label: 'Perlu Perbaikan', tone: 'red' },
      tidak_valid: { label: 'Tidak Valid', tone: 'red' },
    },
    statusMeta: {
      penerima: { label: 'Penerima', tone: 'green' },
      cadangan: { label: 'Cadangan', tone: 'blue' },
      menunggu: { label: 'Menunggu', tone: 'amber' },
      bukan: { label: 'Bukan Penerima', tone: 'gray' },
    },
  };
})();
