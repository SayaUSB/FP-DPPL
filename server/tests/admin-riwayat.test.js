const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-admin-riwayat.sqlite');
process.env.JWT_SECRET = 'test-secret';
const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');

afterAll(() => {
  const p = process.env.DB_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

async function loginAdmin(agent) {
  await agent.post('/api/auth/login').send({ nik: 'pengurus', password: 'pengurus123' });
}

async function seedWarga(nik) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ nama: `Warga ${nik}`, nik, password: 'password1' });
  await agent.post('/api/auth/login').send({ nik, password: 'password1' });
  await agent.put('/api/warga/me/data-administratif').send({
    kategori_kerja: 'serabutan', pekerjaan: 'Buruh', pendapatan: 1000000, tanggungan: 3,
    status_rumah: 'Kontrak', kondisi_rumah: 'Kurang Layak',
  });
}

test('UC04: past periode shows up in riwayat once a newer periode opens', async () => {
  await seedWarga('r1');
  const agent = request.agent(app);
  await loginAdmin(agent);

  await agent.post('/api/admin/bantuan').send({ nama_bantuan: 'BST', kuota: 5, periode: 'Q1 2026' });
  await agent.get('/api/admin/seleksi'); // materializes hasil_seleksi rows for Q1
  await agent.post('/api/admin/bantuan').send({ nama_bantuan: 'BST', kuota: 5, periode: 'Q2 2026' });

  const riwayat = await agent.get('/api/admin/riwayat');
  expect(riwayat.status).toBe(200);
  expect(riwayat.body.some((r) => r.periode === 'Q1 2026')).toBe(true);
  expect(riwayat.body.some((r) => r.periode === 'Q2 2026')).toBe(false); // active periode isn't "history" yet

  const filtered = await agent.get('/api/admin/riwayat?periode=Q1 2026');
  expect(filtered.body.every((r) => r.periode === 'Q1 2026')).toBe(true);
});
