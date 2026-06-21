# VLM Kondisi Rumah Advisory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an advisory house-condition classification, produced by a local VLM (via Ollama) from the warga's uploaded photos, that Pengurus RT sees as a hint during UC02 verification — never overwriting the manually-set `kondisi_rumah` value.

**Architecture:** A new isolated module `server/src/vlm.js` wraps all Ollama HTTP calls (classify one photo, aggregate three into a worst-case verdict). The `POST /api/warga/me/foto` route fires this off without awaiting it once all 3 photo types exist, writing the result to two new advisory-only columns. The admin API and Verifikasi drawer surface the advisory as a clearly-labeled suggestion.

**Tech Stack:** Node.js, Express, better-sqlite3 (schema migration via `pragma table_info`), Ollama HTTP API (`/api/generate`), Jest (mocked `fetch`), React.

Reference spec: `docs/superpowers/specs/2026-06-21-vlm-kondisi-rumah-design.md`

---

## Task 1: Schema migration for advisory columns

**Files:**
- Modify: `server/src/db.js:88-89` (insert migration block between the `db.exec(...)` schema block and the admin-seed block)
- Test: `server/tests/db.test.js`

- [ ] **Step 1: Write the failing test**

Add to `server/tests/db.test.js` (after the existing two tests, before the closing of the file):

```js
test('adds ai_kondisi_saran and ai_kondisi_alasan columns to data_administratif', () => {
  const db = freshDb();
  const columns = db.prepare("PRAGMA table_info(data_administratif)").all().map((c) => c.name);
  expect(columns).toEqual(expect.arrayContaining(['ai_kondisi_saran', 'ai_kondisi_alasan']));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/db.test.js`
Expected: FAIL — `ai_kondisi_saran` not in columns array

- [ ] **Step 3: Add the migration**

In `server/src/db.js`, insert this block immediately after the `db.exec(...)` call that creates the tables (right before the `const adminExists = ...` line):

```js
const dataAdminColumns = db.prepare("PRAGMA table_info(data_administratif)").all().map((c) => c.name);
if (!dataAdminColumns.includes('ai_kondisi_saran')) {
  db.exec('ALTER TABLE data_administratif ADD COLUMN ai_kondisi_saran TEXT');
}
if (!dataAdminColumns.includes('ai_kondisi_alasan')) {
  db.exec('ALTER TABLE data_administratif ADD COLUMN ai_kondisi_alasan TEXT');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/db.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full backend suite to confirm no regressions**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npm test`
Expected: All suites still pass (35 tests: 34 existing + 1 new)

- [ ] **Step 6: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/db.js server/tests/db.test.js && git commit -m "feat: add ai_kondisi_saran/ai_kondisi_alasan advisory columns"
```

---

## Task 2: VLM client module — classifyPhoto

**Files:**
- Create: `server/src/vlm.js`
- Test: `server/tests/vlm.test.js`

This task builds the lowest-level piece: classify a single photo. Task 3 builds the aggregation on top of it.

- [ ] **Step 1: Write the failing test**

`server/tests/vlm.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/vlm.test.js`
Expected: FAIL with "Cannot find module '../src/vlm'"

- [ ] **Step 3: Implement classifyPhoto**

`server/src/vlm.js`:
```js
const fs = require('fs');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_VLM_MODEL = process.env.OLLAMA_VLM_MODEL || 'moondream';
const VALID_KONDISI = ['Layak', 'Kurang Layak', 'Tidak Layak'];
const SEVERITY = { 'Tidak Layak': 3, 'Kurang Layak': 2, Layak: 1 };
const TIMEOUT_MS = 15000;

const PROMPT = `Anda menilai kondisi kelayakan rumah dari sebuah foto untuk program bantuan
sosial. Klasifikasikan foto ini sebagai salah satu dari: "Layak", "Kurang
Layak", atau "Tidak Layak". Balas HANYA dengan JSON valid, tanpa teks lain,
format: {"kondisi": "<salah satu kategori>", "alasan": "<1 kalimat singkat>"}`;

function extractJsonBlock(text) {
  const match = text.match(/\{[^{}]*\}/);
  return match ? match[0] : null;
}

async function classifyPhoto(absoluteFilePath) {
  try {
    const imageBase64 = fs.readFileSync(absoluteFilePath).toString('base64');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_VLM_MODEL,
        prompt: PROMPT,
        images: [imageBase64],
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    const jsonBlock = extractJsonBlock(data.response || '');
    if (!jsonBlock) return null;

    const parsed = JSON.parse(jsonBlock);
    if (!VALID_KONDISI.includes(parsed.kondisi)) return null;
    return { kondisi: parsed.kondisi, alasan: String(parsed.alasan || '') };
  } catch (e) {
    return null;
  }
}

module.exports = { classifyPhoto, VALID_KONDISI, SEVERITY };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/vlm.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/vlm.js server/tests/vlm.test.js && git commit -m "feat: add VLM single-photo classification via Ollama"
```

---

## Task 3: Aggregation — classifyKondisiRumah

**Files:**
- Modify: `server/src/vlm.js` (add alongside `classifyPhoto`)
- Test: `server/tests/vlm.test.js` (append)

- [ ] **Step 1: Write the failing test**

Append to `server/tests/vlm.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/vlm.test.js`
Expected: FAIL with "classifyKondisiRumah is not a function"

- [ ] **Step 3: Implement classifyKondisiRumah**

In `server/src/vlm.js`, add after `classifyPhoto` and before `module.exports`:
```js
async function classifyKondisiRumah(fotoRows) {
  const results = await Promise.all(
    fotoRows.map((f) => classifyPhoto(f.file_path))
  );
  const valid = results.filter((r) => r !== null);
  if (valid.length === 0) return null;

  return valid.reduce((worst, current) =>
    SEVERITY[current.kondisi] > SEVERITY[worst.kondisi] ? current : worst
  );
}
```

Update the `module.exports` line to:
```js
module.exports = { classifyPhoto, classifyKondisiRumah, VALID_KONDISI, SEVERITY };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/vlm.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/vlm.js server/tests/vlm.test.js && git commit -m "feat: aggregate per-photo VLM results into a worst-case kondisi rumah verdict"
```

---

## Task 4: Wire the trigger into the foto upload route

**Files:**
- Modify: `server/src/routes/warga.js:1-9` (add `vlm` require), `:67-83` (extend the `POST /me/foto` handler)
- Test: `server/tests/warga-routes.test.js`

This is where the absolute file path matters: `classifyPhoto` needs a real filesystem path, but `foto_rumah.file_path` only stores the filename (e.g. `"1234-rumah.jpg"`). The upload directory is `path.join(__dirname, '..', '..', 'uploads')`, already computed for multer's `destination` — reuse it.

- [ ] **Step 1: Write the failing test**

Add to `server/tests/warga-routes.test.js`, near the top (after the existing `afterAll`):
```js
jest.mock('../src/vlm', () => ({
  classifyKondisiRumah: jest.fn(),
}));
const { classifyKondisiRumah } = require('../src/vlm');
```

Append these tests at the end of the file:
```js
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
  await new Promise((resolve) => setImmediate(resolve));

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
  await new Promise((resolve) => setImmediate(resolve));

  const db = require('../src/db');
  const profile = db.prepare('SELECT id FROM warga WHERE nik = ?').get('777777');
  const row = db.prepare('SELECT ai_kondisi_saran FROM data_administratif WHERE warga_id = ?').get(profile.id);
  expect(row.ai_kondisi_saran).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/warga-routes.test.js`
Expected: FAIL — `classifyKondisiRumah` never called (the route doesn't trigger it yet)

- [ ] **Step 3: Wire the trigger**

In `server/src/routes/warga.js`, add the import at the top alongside the other requires:
```js
const { classifyKondisiRumah } = require('../vlm');
```

Replace the `router.post('/me/foto', ...)` handler body with:
```js
router.post('/me/foto', upload.single('foto'), (req, res) => {
  const { jenis, deskripsi } = req.body;
  if (!['eksterior', 'interior', 'lingkungan'].includes(jenis)) {
    return res.status(400).json({ error: 'jenis harus salah satu dari eksterior, interior, lingkungan' });
  }
  if (!req.file) return res.status(400).json({ error: 'File foto wajib diunggah' });

  const wargaId = getWargaId(req);
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO foto_rumah (warga_id, jenis, file_path, deskripsi) VALUES (?, ?, ?, ?)'
  ).run(wargaId, jenis, req.file.filename, deskripsi || null);

  db.prepare(`
    UPDATE data_administratif SET chk_foto = 1, updated_at = datetime('now') WHERE warga_id = ?
  `).run(wargaId);

  const distinctJenis = db.prepare(
    'SELECT COUNT(DISTINCT jenis) AS c FROM foto_rumah WHERE warga_id = ?'
  ).get(wargaId).c;

  if (distinctJenis === 3) {
    const latestPerJenis = db.prepare(`
      SELECT f.jenis, f.file_path FROM foto_rumah f
      WHERE f.warga_id = ? AND f.id = (
        SELECT MAX(id) FROM foto_rumah WHERE warga_id = f.warga_id AND jenis = f.jenis
      )
    `).all(wargaId).map((f) => ({ jenis: f.jenis, file_path: path.join(__dirname, '..', '..', 'uploads', f.file_path) }));

    classifyKondisiRumah(latestPerJenis)
      .then((result) => {
        if (!result) return;
        db.prepare(
          'UPDATE data_administratif SET ai_kondisi_saran = ?, ai_kondisi_alasan = ? WHERE warga_id = ?'
        ).run(result.kondisi, result.alasan, wargaId);
      })
      .catch(() => {});
  }

  res.status(201).json({ id: lastInsertRowid, jenis, file_path: req.file.filename });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/warga-routes.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the full backend suite**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npm test`
Expected: All suites pass (38 tests: 35 from Task 1 + 3 new here, plus the 9 vlm tests already counted — total should read 44; run it and confirm the printed total, the exact count isn't the point, 0 failures is)

- [ ] **Step 6: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/routes/warga.js server/tests/warga-routes.test.js && git commit -m "feat: trigger VLM kondisi rumah classification after 3rd photo upload"
```

---

## Task 5: Expose advisory columns through the admin API

**Files:**
- Modify: `server/src/routes/admin.js` (the `rowToWarga` function and `WARGA_JOIN_SELECT` constant, both near the top after the `/bantuan/active` route)
- Test: `server/tests/admin-warga.test.js`

- [ ] **Step 1: Write the failing test**

Append to `server/tests/admin-warga.test.js`:
```js
test('GET /admin/warga/:id includes the VLM advisory columns when present', async () => {
  const wargaId = await seedWarga('vlm1');
  const db2 = require('../src/db');
  db2.prepare('UPDATE data_administratif SET ai_kondisi_saran = ?, ai_kondisi_alasan = ? WHERE warga_id = ?')
    .run('Tidak Layak', 'Atap bocor di beberapa titik.', wargaId);

  const agent = request.agent(app);
  await loginAdmin(agent);
  const res = await agent.get(`/api/admin/warga/${wargaId}`);
  expect(res.body.ai_kondisi_saran).toBe('Tidak Layak');
  expect(res.body.ai_kondisi_alasan).toBe('Atap bocor di beberapa titik.');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/admin-warga.test.js`
Expected: FAIL — `res.body.ai_kondisi_saran` is `undefined`

- [ ] **Step 3: Extend the SELECT and mapper**

In `server/src/routes/admin.js`, change `WARGA_JOIN_SELECT` from:
```js
const WARGA_JOIN_SELECT = `
  SELECT w.*, d.kategori_kerja, d.pekerjaan, d.pendapatan, d.tanggungan,
         d.status_rumah, d.kondisi_rumah, d.skor_prioritas, d.validitas,
         d.catatan_verifikasi, d.chk_ktp, d.chk_kk, d.chk_pendapatan, d.chk_foto
  FROM warga w JOIN data_administratif d ON d.warga_id = w.id
`;
```
to:
```js
const WARGA_JOIN_SELECT = `
  SELECT w.*, d.kategori_kerja, d.pekerjaan, d.pendapatan, d.tanggungan,
         d.status_rumah, d.kondisi_rumah, d.skor_prioritas, d.validitas,
         d.catatan_verifikasi, d.chk_ktp, d.chk_kk, d.chk_pendapatan, d.chk_foto,
         d.ai_kondisi_saran, d.ai_kondisi_alasan
  FROM warga w JOIN data_administratif d ON d.warga_id = w.id
`;
```

And change `rowToWarga` from:
```js
function rowToWarga(row) {
  return {
    id: row.id, nama: row.nama, nik: row.nik, no_kk: row.no_kk,
    alamat: row.alamat, no_telepon: row.no_telepon,
    kategori_kerja: row.kategori_kerja, pekerjaan: row.pekerjaan,
    pendapatan: row.pendapatan, tanggungan: row.tanggungan,
    status_rumah: row.status_rumah, kondisi_rumah: row.kondisi_rumah,
    skor_prioritas: row.skor_prioritas, validitas: row.validitas,
    catatan_verifikasi: row.catatan_verifikasi,
    chk_ktp: !!row.chk_ktp, chk_kk: !!row.chk_kk,
    chk_pendapatan: !!row.chk_pendapatan, chk_foto: !!row.chk_foto,
  };
}
```
to:
```js
function rowToWarga(row) {
  return {
    id: row.id, nama: row.nama, nik: row.nik, no_kk: row.no_kk,
    alamat: row.alamat, no_telepon: row.no_telepon,
    kategori_kerja: row.kategori_kerja, pekerjaan: row.pekerjaan,
    pendapatan: row.pendapatan, tanggungan: row.tanggungan,
    status_rumah: row.status_rumah, kondisi_rumah: row.kondisi_rumah,
    skor_prioritas: row.skor_prioritas, validitas: row.validitas,
    catatan_verifikasi: row.catatan_verifikasi,
    chk_ktp: !!row.chk_ktp, chk_kk: !!row.chk_kk,
    chk_pendapatan: !!row.chk_pendapatan, chk_foto: !!row.chk_foto,
    ai_kondisi_saran: row.ai_kondisi_saran, ai_kondisi_alasan: row.ai_kondisi_alasan,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npx jest tests/admin-warga.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Run the full backend suite**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/server" && npm test`
Expected: All suites pass, 0 failures

- [ ] **Step 6: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/src/routes/admin.js server/tests/admin-warga.test.js && git commit -m "feat: expose VLM advisory columns through the admin warga API"
```

---

## Task 6: Show the advisory in the Verifikasi drawer

**Files:**
- Modify: `web/src/pages/admin/Verifikasi.jsx` (the `field-grid` block inside `VerifikasiDrawer`)

No backend test applies here — this is a presentation-only change. Verify by building and a manual check (Step 3).

- [ ] **Step 1: Locate the field-grid block**

In `web/src/pages/admin/Verifikasi.jsx`, find this existing block inside `VerifikasiDrawer`:
```jsx
          <div className="field-grid">
            <div className="field"><div className="field-label">Pekerjaan</div><div className="field-val">{warga.pekerjaan || '-'}</div></div>
            <div className="field"><div className="field-label">Pendapatan / bln</div><div className="field-val">Rp {Number(warga.pendapatan || 0).toLocaleString('id-ID')}</div></div>
            <div className="field"><div className="field-label">Tanggungan</div><div className="field-val">{warga.tanggungan ?? '-'} orang</div></div>
            <div className="field"><div className="field-label">No. KK</div><div className="field-val">{warga.no_kk || '-'}</div></div>
            <div className="field"><div className="field-label">Status Rumah</div><div className="field-val">{warga.status_rumah || '-'}</div></div>
            <div className="field"><div className="field-label">Kondisi Rumah</div><div className="field-val">{warga.kondisi_rumah || '-'}</div></div>
            <div className="field full"><div className="field-label">Alamat</div><div className="field-val" style={{ fontSize: 13.5 }}>{warga.alamat || '-'}</div></div>
          </div>
```

- [ ] **Step 2: Add the advisory box right after it**

Replace that block with:
```jsx
          <div className="field-grid">
            <div className="field"><div className="field-label">Pekerjaan</div><div className="field-val">{warga.pekerjaan || '-'}</div></div>
            <div className="field"><div className="field-label">Pendapatan / bln</div><div className="field-val">Rp {Number(warga.pendapatan || 0).toLocaleString('id-ID')}</div></div>
            <div className="field"><div className="field-label">Tanggungan</div><div className="field-val">{warga.tanggungan ?? '-'} orang</div></div>
            <div className="field"><div className="field-label">No. KK</div><div className="field-val">{warga.no_kk || '-'}</div></div>
            <div className="field"><div className="field-label">Status Rumah</div><div className="field-val">{warga.status_rumah || '-'}</div></div>
            <div className="field"><div className="field-label">Kondisi Rumah</div><div className="field-val">{warga.kondisi_rumah || '-'}</div></div>
            <div className="field full"><div className="field-label">Alamat</div><div className="field-val" style={{ fontSize: 13.5 }}>{warga.alamat || '-'}</div></div>
          </div>

          {warga.ai_kondisi_saran && (
            <div className="mt12" style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Icon name="sparkle" style={{ color: 'var(--blue-600)', marginTop: 1 }} />
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
                <strong>Saran Asisten AI (VLM):</strong> {warga.ai_kondisi_saran}
                {warga.ai_kondisi_alasan && <> — <em>"{warga.ai_kondisi_alasan}"</em></>}
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                  Saran otomatis dari foto, bukan keputusan resmi. Kondisi Rumah di atas tetap nilai yang dipilih warga/RT.
                </div>
              </div>
            </div>
          )}
```

- [ ] **Step 3: Build to verify it compiles**

Run: `cd "/home/usb/Desktop/tugas/FP DPPL/web" && npm run build`
Expected: Build succeeds with no errors (the `Icon` import already exists at the top of this file from the existing code).

Then clean up the build artifact: `rm -rf "/home/usb/Desktop/tugas/FP DPPL/web/dist"`

- [ ] **Step 4: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add web/src/pages/admin/Verifikasi.jsx && git commit -m "feat: show VLM kondisi rumah advisory in the verifikasi drawer"
```

---

## Task 7: Document the Ollama environment variables

**Files:**
- Modify: `server/.env.example`

- [ ] **Step 1: Add the two new variables**

Current `server/.env.example`:
```
PORT=5050
JWT_SECRET=change-me-in-production
WEB_ORIGIN=http://localhost:5173
```

Replace with:
```
PORT=5050
JWT_SECRET=change-me-in-production
WEB_ORIGIN=http://localhost:5173

# Optional: local Ollama for the VLM kondisi-rumah advisory (UC07).
# If Ollama isn't running, the advisory is silently skipped — everything
# else keeps working normally.
OLLAMA_URL=http://localhost:11434
OLLAMA_VLM_MODEL=moondream
```

- [ ] **Step 2: Commit**

```bash
cd "/home/usb/Desktop/tugas/FP DPPL" && git add server/.env.example && git commit -m "docs: document Ollama env vars for the VLM advisory feature"
```

---

## Plan Self-Review Notes

- **Spec coverage:** §3 architecture → Tasks 2-4 (vlm.js + trigger). §3 schema/API exposure → Tasks 1, 5. §4 prompt → Task 2. §5 frontend → Task 6. §6 error handling → covered by every "returns null on X" test in Task 2-3, and Task 4's "upload still succeeds" test. §7 testing → Tasks 2-5 each carry their own tests. §8 out-of-scope items (no KTP/KK OCR, no model-picker UI, no bundling Ollama) — correctly nothing in this plan does any of those.
- **Placeholder scan:** no TBD/TODO; every step has runnable code.
- **Type consistency:** `classifyPhoto(absoluteFilePath)` and `classifyKondisiRumah(fotoRows)` signatures match between Task 2/3's implementation and Task 4's usage (`fotoRows` is an array of `{ jenis, file_path }` with `file_path` already resolved to an absolute path before calling, exactly as Task 4's route code does). `ai_kondisi_saran`/`ai_kondisi_alasan` column names match across Task 1 (schema), Task 4 (UPDATE), and Task 5 (SELECT + mapper).
