const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'test-auth-routes.sqlite');
process.env.JWT_SECRET = 'test-secret';
const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');

afterAll(() => {
  const p = process.env.DB_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

test('warga can register, then login, then fetch /me', async () => {
  const agent = request.agent(app);

  const reg = await agent.post('/api/auth/register').send({
    nama: 'Sumarni Wijaya', nik: '3578014501780099', password: 'rahasia123',
  });
  expect(reg.status).toBe(201);

  const login = await agent.post('/api/auth/login').send({
    nik: '3578014501780099', password: 'rahasia123',
  });
  expect(login.status).toBe(200);
  expect(login.body.role).toBe('warga');

  const me = await agent.get('/api/auth/me');
  expect(me.status).toBe(200);
  expect(me.body.role).toBe('warga');
  expect(me.body.nama).toBe('Sumarni Wijaya');
});

test('registering with a duplicate NIK fails with 400', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ nama: 'A', nik: '111', password: 'password1' });
  const dup = await agent.post('/api/auth/register').send({ nama: 'B', nik: '111', password: 'password2' });
  expect(dup.status).toBe(400);
});

test('admin can login with seeded credentials', async () => {
  const agent = request.agent(app);
  const login = await agent.post('/api/auth/login').send({ nik: 'pengurus', password: 'pengurus123' });
  expect(login.status).toBe(200);
  expect(login.body.role).toBe('admin');
});

test('logout clears the session', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ nik: 'pengurus', password: 'pengurus123' });
  await agent.post('/api/auth/logout');
  const me = await agent.get('/api/auth/me');
  expect(me.status).toBe(401);
});
