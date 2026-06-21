const fs = require('fs');
const path = require('path');

const TEST_IMAGE = path.join(__dirname, 'fixtures', 'test-photo.txt');

beforeAll(() => {
  fs.mkdirSync(path.dirname(TEST_IMAGE), { recursive: true });
  fs.writeFileSync(TEST_IMAGE, 'fake-image-bytes');
});

afterAll(() => {
  fs.rmSync(path.dirname(TEST_IMAGE), { recursive: true, force: true });
});

afterEach(() => {
  delete global.fetch;
});

const { classifyPhoto } = require('../src/vlm');

test('classifyPhoto returns parsed kondisi/alasan on a valid model response', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ response: '{"kondisi": "Kurang Layak", "alasan": "Dinding tampak retak."}' }),
  });
  const result = await classifyPhoto(TEST_IMAGE);
  expect(result).toEqual({ kondisi: 'Kurang Layak', alasan: 'Dinding tampak retak.' });
});

test('classifyPhoto strips leading text before the JSON block', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ response: 'Here is the result:\n{"kondisi": "Layak", "alasan": "Rumah terlihat terawat."}' }),
  });
  const result = await classifyPhoto(TEST_IMAGE);
  expect(result).toEqual({ kondisi: 'Layak', alasan: 'Rumah terlihat terawat.' });
});

test('classifyPhoto returns null when the model response is not valid JSON', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ response: 'I cannot determine this.' }),
  });
  const result = await classifyPhoto(TEST_IMAGE);
  expect(result).toBeNull();
});

test('classifyPhoto returns null when kondisi is not one of the 3 valid categories', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ response: '{"kondisi": "Bagus Sekali", "alasan": "x"}' }),
  });
  const result = await classifyPhoto(TEST_IMAGE);
  expect(result).toBeNull();
});

test('classifyPhoto correctly extracts JSON even when alasan contains a literal brace character', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ response: '{"kondisi": "Kurang Layak", "alasan": "dinding ada {coretan} kecil"}' }),
  });
  const result = await classifyPhoto(TEST_IMAGE);
  expect(result).toEqual({ kondisi: 'Kurang Layak', alasan: 'dinding ada {coretan} kecil' });
});

test('classifyPhoto returns null when fetch rejects (Ollama not running)', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));
  const result = await classifyPhoto(TEST_IMAGE);
  expect(result).toBeNull();
});

test('classifyPhoto returns null when the HTTP response is not ok', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
  const result = await classifyPhoto(TEST_IMAGE);
  expect(result).toBeNull();
});

const { classifyKondisiRumah } = require('../src/vlm');

test('classifyKondisiRumah picks the most severe result among 3 photos', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ response: '{"kondisi": "Layak", "alasan": "Eksterior rapi."}' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ response: '{"kondisi": "Tidak Layak", "alasan": "Atap bocor parah."}' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ response: '{"kondisi": "Kurang Layak", "alasan": "Lingkungan kurang bersih."}' }) });

  const result = await classifyKondisiRumah([
    { jenis: 'eksterior', file_path: TEST_IMAGE },
    { jenis: 'interior', file_path: TEST_IMAGE },
    { jenis: 'lingkungan', file_path: TEST_IMAGE },
  ]);

  expect(result).toEqual({ kondisi: 'Tidak Layak', alasan: 'Atap bocor parah.' });
});

test('classifyKondisiRumah ignores photos that failed to classify and still returns the worst valid one', async () => {
  global.fetch = jest.fn()
    .mockRejectedValueOnce(new Error('timeout'))
    .mockResolvedValueOnce({ ok: true, json: async () => ({ response: '{"kondisi": "Kurang Layak", "alasan": "Cat dinding mengelupas."}' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ response: '{"kondisi": "Layak", "alasan": "Lingkungan bersih."}' }) });

  const result = await classifyKondisiRumah([
    { jenis: 'eksterior', file_path: TEST_IMAGE },
    { jenis: 'interior', file_path: TEST_IMAGE },
    { jenis: 'lingkungan', file_path: TEST_IMAGE },
  ]);

  expect(result).toEqual({ kondisi: 'Kurang Layak', alasan: 'Cat dinding mengelupas.' });
});

test('classifyKondisiRumah returns null when every photo fails to classify', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));

  const result = await classifyKondisiRumah([
    { jenis: 'eksterior', file_path: TEST_IMAGE },
    { jenis: 'interior', file_path: TEST_IMAGE },
    { jenis: 'lingkungan', file_path: TEST_IMAGE },
  ]);

  expect(result).toBeNull();
});
