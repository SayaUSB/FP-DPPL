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
