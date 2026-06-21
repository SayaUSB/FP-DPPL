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

jest.mock('../src/vlm', () => ({
  classifyKondisiRumah: jest.fn(),
}));
const { classifyKondisiRumah } = require('../src/vlm');

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  classifyKondisiRumah.mockClear();
});

afterEach(() => {
  console.error.mockRestore();
});

function tick() {
  return new Promise((resolve) => setImmediate(resolve));
}

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

test('UC07: uploading the 3rd distinct jenis triggers classifyKondisiRumah, which updates the advisory columns', async () => {
  classifyKondisiRumah.mockResolvedValue({ kondisi: 'Kurang Layak', alasan: 'Atap terlihat rapuh.' });

  const agent = request.agent(app);
  await registerAndLogin(agent, '666666');

  const upload = (jenis) => agent.post('/api/warga/me/foto').field('jenis', jenis).attach('foto', Buffer.from('x'), `test-${jenis}.jpg`);

  const r1 = await upload('eksterior');
  expect(r1.status).toBe(201);
  expect(classifyKondisiRumah).not.toHaveBeenCalled();

  const r2 = await upload('interior');
  expect(r2.status).toBe(201);
  expect(classifyKondisiRumah).not.toHaveBeenCalled();

  const r3 = await upload('lingkungan');
  expect(r3.status).toBe(201);

  // The route fires classifyKondisiRumah without awaiting it, so give the
  // microtask queue a tick to let the .then() callback run before asserting.
  await tick();

  expect(classifyKondisiRumah).toHaveBeenCalledTimes(1);

  const db = require('../src/db');
  const profile = db.prepare('SELECT id FROM warga WHERE nik = ?').get('666666');
  const row = db.prepare('SELECT ai_kondisi_saran, ai_kondisi_alasan FROM data_administratif WHERE warga_id = ?').get(profile.id);
  expect(row.ai_kondisi_saran).toBe('Kurang Layak');
  expect(row.ai_kondisi_alasan).toBe('Atap terlihat rapuh.');
});

test('UC07: upload still succeeds with 201 even if classifyKondisiRumah rejects', async () => {
  classifyKondisiRumah.mockRejectedValue(new Error('Ollama unreachable'));

  const agent = request.agent(app);
  await registerAndLogin(agent, '777777');

  const upload = (jenis) => agent.post('/api/warga/me/foto').field('jenis', jenis).attach('foto', Buffer.from('x'), `test-${jenis}.jpg`);
  await upload('eksterior');
  await upload('interior');
  const r3 = await upload('lingkungan');

  expect(r3.status).toBe(201);
  await tick();

  const db = require('../src/db');
  const profile = db.prepare('SELECT id FROM warga WHERE nik = ?').get('777777');
  const row = db.prepare('SELECT ai_kondisi_saran FROM data_administratif WHERE warga_id = ?').get(profile.id);
  expect(row.ai_kondisi_saran).toBeNull();
});

test('UC07: a re-upload while a classification is still in flight is queued, not run concurrently, and picks up the newer photo once the first run finishes', async () => {
  const agent = request.agent(app);
  await registerAndLogin(agent, '999999');
  const upload = (jenis) => agent.post('/api/warga/me/foto').field('jenis', jenis).attach('foto', Buffer.from('x'), `test-${jenis}.jpg`);

  await upload('eksterior');
  await upload('interior');

  let resolveFirstRun;
  classifyKondisiRumah.mockImplementationOnce(() => new Promise((resolve) => { resolveFirstRun = resolve; }));

  const r3 = await upload('lingkungan');
  expect(r3.status).toBe(201);
  await tick();
  expect(classifyKondisiRumah).toHaveBeenCalledTimes(1);

  // Re-upload while the first run is still in flight (resolveFirstRun not yet
  // called) — this must NOT spawn a second, overlapping classification call.
  classifyKondisiRumah.mockResolvedValueOnce({ kondisi: 'Layak', alasan: 'Foto eksterior baru terlihat baik.' });
  const r4 = await upload('eksterior');
  expect(r4.status).toBe(201);
  await tick();
  expect(classifyKondisiRumah).toHaveBeenCalledTimes(1);

  // Finishing the first run must trigger exactly one queued follow-up run
  // (using the freshly re-uploaded photo), not zero and not more than one.
  resolveFirstRun({ kondisi: 'Kurang Layak', alasan: 'Hasil run pertama.' });
  await tick();
  await tick();
  expect(classifyKondisiRumah).toHaveBeenCalledTimes(2);

  const db = require('../src/db');
  const profile = db.prepare('SELECT id FROM warga WHERE nik = ?').get('999999');
  const row = db.prepare('SELECT ai_kondisi_saran, ai_kondisi_alasan FROM data_administratif WHERE warga_id = ?').get(profile.id);
  // The follow-up run's result (based on the newer photo) is what's persisted,
  // not the first run's now-stale result — this is the race-condition fix.
  expect(row.ai_kondisi_saran).toBe('Layak');
  expect(row.ai_kondisi_alasan).toBe('Foto eksterior baru terlihat baik.');
});
