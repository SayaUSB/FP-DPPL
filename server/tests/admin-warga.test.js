const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-admin-warga.sqlite');
process.env.JWT_SECRET = 'test-secret';
const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

afterAll(() => {
  const p = process.env.DB_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

async function loginAdmin(agent) {
  await agent.post('/api/auth/login').send({ nik: 'pengurus', password: 'pengurus123' });
}

async function seedWarga(nik) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ nama: 'Bambang Setiawan', nik, password: 'password1' });
  await agent.post('/api/auth/login').send({ nik, password: 'password1' });
  await agent.put('/api/warga/me/data-administratif').send({
    kategori_kerja: 'serabutan', pekerjaan: 'Tukang Bangunan', pendapatan: 1600000,
    tanggungan: 3, status_rumah: 'Kontrak', kondisi_rumah: 'Kurang Layak',
  });
  return db.prepare('SELECT id FROM warga WHERE nik = ?').get(nik).id;
}

test('UC02: admin lists warga and filters by validitas', async () => {
  await seedWarga('aaa');
  const agent = request.agent(app);
  await loginAdmin(agent);

  const all = await agent.get('/api/admin/warga');
  expect(all.body.length).toBeGreaterThanOrEqual(1);

  const menunggu = await agent.get('/api/admin/warga?validitas=menunggu');
  expect(menunggu.body.every((w) => w.validitas === 'menunggu')).toBe(true);

  const search = await agent.get('/api/admin/warga?search=Bambang');
  expect(search.body.some((w) => w.nama === 'Bambang Setiawan')).toBe(true);
});

test('UC02: admin sets validitas with checklist and catatan', async () => {
  const wargaId = await seedWarga('bbb');
  const agent = request.agent(app);
  await loginAdmin(agent);

  const res = await agent.put(`/api/admin/warga/${wargaId}/validitas`).send({
    validitas: 'valid', catatan_verifikasi: 'Data lengkap', chk_ktp: true, chk_kk: true,
    chk_pendapatan: true, chk_foto: true,
  });
  expect(res.status).toBe(200);
  expect(res.body.validitas).toBe('valid');
});

test('UC05: admin edits warga data, which recomputes score and resets validitas', async () => {
  const wargaId = await seedWarga('ccc');
  const agent = request.agent(app);
  await loginAdmin(agent);
  await agent.put(`/api/admin/warga/${wargaId}/validitas`).send({ validitas: 'valid', chk_ktp: true, chk_kk: true, chk_pendapatan: true, chk_foto: true });

  const res = await agent.put(`/api/admin/warga/${wargaId}`).send({
    kategori_kerja: 'tidak_bekerja', pekerjaan: 'Tidak Bekerja', pendapatan: 600000,
    tanggungan: 5, status_rumah: 'Menumpang', kondisi_rumah: 'Tidak Layak',
  });
  expect(res.status).toBe(200);
  expect(res.body.validitas).toBe('menunggu');
  expect(res.body.skor_prioritas).toBeGreaterThanOrEqual(70);
});

test('skor-preview computes a score without persisting anything', async () => {
  const agent = request.agent(app);
  await loginAdmin(agent);
  const res = await agent.post('/api/admin/skor-preview').send({
    pendapatan: 600000, tanggungan: 5, kondisiRumah: 'Tidak Layak',
    statusRumah: 'Menumpang', kategoriKerja: 'tidak_bekerja',
  });
  expect(res.status).toBe(200);
  expect(res.body.skor).toBeGreaterThanOrEqual(70);
});
