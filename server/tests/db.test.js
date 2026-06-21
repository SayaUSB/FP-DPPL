const fs = require('fs');
const path = require('path');

const TEST_DB_PATH = path.join(__dirname, 'test-db.sqlite');

function freshDb() {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  process.env.DB_PATH = TEST_DB_PATH;
  delete require.cache[require.resolve('../src/db')];
  return require('../src/db');
}

afterAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

test('creates all expected tables', () => {
  const db = freshDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
  expect(tables).toEqual(
    expect.arrayContaining([
      'users', 'warga', 'foto_rumah', 'data_administratif',
      'bantuan', 'hasil_seleksi', 'notifications',
    ])
  );
});

test('seeds exactly one admin user', () => {
  const db = freshDb();
  const admins = db.prepare("SELECT * FROM users WHERE role = 'admin'").all();
  expect(admins.length).toBe(1);
  expect(admins[0].username).toBe('pengurus');
});

test('adds ai_kondisi_saran and ai_kondisi_alasan columns to data_administratif', () => {
  const db = freshDb();
  const columns = db.prepare("PRAGMA table_info(data_administratif)").all().map((c) => c.name);
  expect(columns).toEqual(expect.arrayContaining(['ai_kondisi_saran', 'ai_kondisi_alasan']));
});
