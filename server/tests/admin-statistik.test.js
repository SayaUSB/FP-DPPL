const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-admin-statistik.sqlite');
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

async function seedWarga(nik, pendapatan, tanggungan, kondisiRumah) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ nama: `Warga ${nik}`, nik, password: 'password1' });
  await agent.post('/api/auth/login').send({ nik, password: 'password1' });
  await agent.put('/api/warga/me/data-administratif').send({
    kategori_kerja: 'serabutan', pekerjaan: 'Buruh', pendapatan, tanggungan,
    status_rumah: 'Kontrak', kondisi_rumah: kondisiRumah,
  });
}

test('UC03: statistik aggregates totals, income distribution, and priority histogram', async () => {
  await seedWarga('s1', 600000, 5, 'Tidak Layak');
  await seedWarga('s2', 4000000, 1, 'Layak');

  const agent = request.agent(app);
  await loginAdmin(agent);
  const res = await agent.get('/api/admin/statistik');

  expect(res.status).toBe(200);
  expect(res.body.totalWarga).toBe(2);
  expect(res.body.distribusiPendapatan.length).toBeGreaterThan(0);
  expect(res.body.donutValiditas.menunggu).toBe(2);
  expect(res.body.histogramPrioritas['Sangat Tinggi']).toBeGreaterThanOrEqual(1);
});

test('UC03: export Excel returns an xlsx file', async () => {
  await seedWarga('s3', 1200000, 2, 'Kurang Layak');
  const agent = request.agent(app);
  await loginAdmin(agent);
  const res = await agent.get('/api/admin/statistik/export?format=excel');
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toContain('spreadsheetml');
});

test('UC03: export PDF returns a pdf file', async () => {
  const agent = request.agent(app);
  await loginAdmin(agent);
  const res = await agent.get('/api/admin/statistik/export?format=pdf');
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toBe('application/pdf');
});
