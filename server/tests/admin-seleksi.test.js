const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-admin-seleksi.sqlite');
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

async function seedWarga(nik, pendapatan, tanggungan) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ nama: `Warga ${nik}`, nik, password: 'password1' });
  await agent.post('/api/auth/login').send({ nik, password: 'password1' });
  await agent.put('/api/warga/me/data-administratif').send({
    kategori_kerja: 'serabutan', pekerjaan: 'Buruh', pendapatan, tanggungan,
    status_rumah: 'Kontrak', kondisi_rumah: 'Kurang Layak',
  });
}

test('UC10: seleksi list is ranked by score descending and statuses are updatable', async () => {
  await seedWarga('p1', 600000, 5);
  await seedWarga('p2', 4000000, 1);

  const agent = request.agent(app);
  await loginAdmin(agent);
  await agent.post('/api/admin/bantuan').send({ nama_bantuan: 'BST', kuota: 1, periode: 'Q1 2026' });

  const list = await agent.get('/api/admin/seleksi');
  expect(list.status).toBe(200);
  expect(list.body.length).toBe(2);
  expect(list.body[0].skor_prioritas).toBeGreaterThanOrEqual(list.body[1].skor_prioritas);

  const top = list.body[0];
  const update = await agent.put(`/api/admin/seleksi/${top.id}`).send({
    status: 'penerima', catatan: 'Memenuhi kriteria prioritas',
  });
  expect(update.status).toBe(200);
  expect(update.body.status).toBe('penerima');

  const notif = db.prepare('SELECT * FROM notifications WHERE warga_id = ?').all(top.warga_id);
  expect(notif.length).toBe(1);
  expect(notif[0].message).toMatch(/penerima/i);
});

test('UC10: rejects an unknown status value', async () => {
  await seedWarga('p3', 1000000, 2);
  const agent = request.agent(app);
  await loginAdmin(agent);
  await agent.post('/api/admin/bantuan').send({ nama_bantuan: 'BST', kuota: 5, periode: 'Q2 2026' });
  const list = await agent.get('/api/admin/seleksi');
  const res = await agent.put(`/api/admin/seleksi/${list.body[0].id}`).send({ status: 'tidak_valid_status' });
  expect(res.status).toBe(400);
});
