const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-admin-bantuan.sqlite');
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

test('UC01: admin opens a new periode, deactivating the previous one', async () => {
  const agent = request.agent(app);
  await loginAdmin(agent);

  const first = await agent.post('/api/admin/bantuan').send({
    nama_bantuan: 'BST', jenis_bantuan: 'tunai', kuota: 5, nominal: 600000, periode: 'Q1 2026',
  });
  expect(first.status).toBe(201);

  const second = await agent.post('/api/admin/bantuan').send({
    nama_bantuan: 'BST', jenis_bantuan: 'tunai', kuota: 6, nominal: 600000, periode: 'Q2 2026',
  });
  expect(second.status).toBe(201);

  const active = await agent.get('/api/admin/bantuan/active');
  expect(active.body.periode).toBe('Q2 2026');
  expect(active.body.kuota).toBe(6);

  const db = require('../src/db');
  const firstRow = db.prepare('SELECT is_active FROM bantuan WHERE periode = ?').get('Q1 2026');
  expect(firstRow.is_active).toBe(0);
});

test('UC01: rejects a kuota of zero or less', async () => {
  const agent = request.agent(app);
  await loginAdmin(agent);
  const res = await agent.post('/api/admin/bantuan').send({
    nama_bantuan: 'BST', kuota: 0, periode: 'Q3 2026',
  });
  expect(res.status).toBe(400);
});

test('non-admin cannot open a periode', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ nama: 'X', nik: '999', password: 'password1' });
  await agent.post('/api/auth/login').send({ nik: '999', password: 'password1' });
  const res = await agent.post('/api/admin/bantuan').send({ nama_bantuan: 'BST', kuota: 5, periode: 'Q1 2026' });
  expect(res.status).toBe(403);
});
