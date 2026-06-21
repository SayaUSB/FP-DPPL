// Weighted, deterministic priority score (total 100):
// income/capita 40 + dependents 20 + house condition 22 + ownership 10 + job stability 8
function faktorPrioritas(w) {
  const perKapita = w.pendapatan / (w.tanggungan + 1);
  let inc = (1.5e6 - perKapita) / (1.5e6 - 300000);
  inc = Math.max(0, Math.min(1, inc));
  const incomeScore = +(inc * 40).toFixed(1);

  const tanggunganScore = +(Math.min(w.tanggungan, 6) / 6 * 20).toFixed(1);

  const rumahMap = { 'Tidak Layak': 22, 'Kurang Layak': 13, Layak: 4 };
  const rumahScore = rumahMap[w.kondisiRumah] ?? 4;

  const statusMap = { Menumpang: 10, Kontrak: 7, 'Milik Sendiri': 3 };
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
