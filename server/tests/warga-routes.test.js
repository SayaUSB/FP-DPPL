const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-warga-routes.sqlite');
process.env.JWT_SECRET = 'test-secret';
const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');

afterAll(() => {
  const p = process.env.DB_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
  const uploadDir = path.join(__dirname, '..', 'uploads');
  fs.readdirSync(uploadDir).forEach((f) => {
    if (f.startsWith('test-') || /^\d+-test-/.test(f)) fs.unlinkSync(path.join(uploadDir, f));
  });
});

async function registerAndLogin(agent, nik) {
  await agent.post('/api/auth/register').send({ nama: 'Aminah Lestari', nik, password: 'password1' });
  await agent.post('/api/auth/login').send({ nik, password: 'password1' });
}

test('UC06: warga can submit data administratif, which computes a priority score', async () => {
  const agent = request.agent(app);
  await registerAndLogin(agent, '111111');

  const res = await agent.put('/api/warga/me/data-administratif').send({
    kategori_kerja: 'tidak_bekerja', pekerjaan: 'Tidak Bekerja', pendapatan: 600000,
    tanggungan: 5, status_rumah: 'Menumpang', kondisi_rumah: 'Tidak Layak',
  });
  expect(res.status).toBe(200);
  expect(res.body.skor_prioritas).toBeGreaterThanOrEqual(70);
  expect(res.body.validitas).toBe('menunggu');
});

test('UC09: updating profile resets validitas back to menunggu', async () => {
  const agent = request.agent(app);
  await registerAndLogin(agent, '222222');
  await agent.put('/api/warga/me/data-administratif').send({
    kategori_kerja: 'tetap', pekerjaan: 'PNS', pendapatan: 5000000,
    tanggungan: 1, status_rumah: 'Milik Sendiri', kondisi_rumah: 'Layak',
  });

  const db = require('../src/db');
  const profile = db.prepare('SELECT id FROM warga WHERE nik = ?').get('222222');
  db.prepare("UPDATE data_administratif SET validitas = 'valid' WHERE warga_id = ?").run(profile.id);

  const res = await agent.put('/api/warga/me/profile').send({ alamat: 'Jl. Baru No. 1', no_telepon: '0800' });
  expect(res.status).toBe(200);

  const after = db.prepare('SELECT validitas FROM data_administratif WHERE warga_id = ?').get(profile.id);
  expect(after.validitas).toBe('menunggu');
});

test('UC07: warga can upload a house-condition photo', async () => {
  const agent = request.agent(app);
  await registerAndLogin(agent, '333333');

  const res = await agent
    .post('/api/warga/me/foto')
    .field('jenis', 'eksterior')
    .field('deskripsi', 'Tampak depan rumah')
    .attach('foto', Buffer.from('fake-image-bytes'), 'test-rumah.jpg');

  expect(res.status).toBe(201);
  expect(res.body.jenis).toBe('eksterior');
});

test('UC07: rejects an unsupported jenis value', async () => {
  const agent = request.agent(app);
  await registerAndLogin(agent, '444444');
  const res = await agent
    .post('/api/warga/me/foto')
    .field('jenis', 'bukan_valid')
    .attach('foto', Buffer.from('fake-image-bytes'), 'test-rumah2.jpg');
  expect(res.status).toBe(400);
});

test('UC08: warga sees menunggu status before any seleksi exists', async () => {
  const agent = request.agent(app);
  await registerAndLogin(agent, '555555');
  const res = await agent.get('/api/warga/me/status');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('belum_diseleksi');
});
