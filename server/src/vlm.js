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
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

async function classifyPhoto(absoluteFilePath) {
  let timer;
  try {
    const imageBase64 = fs.readFileSync(absoluteFilePath).toString('base64');
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

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

    if (!res.ok) return null;
    const data = await res.json();
    const jsonBlock = extractJsonBlock(data.response || '');
    if (!jsonBlock) return null;

    const parsed = JSON.parse(jsonBlock);
    if (!VALID_KONDISI.includes(parsed.kondisi)) return null;
    return { kondisi: parsed.kondisi, alasan: String(parsed.alasan || '') };
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

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

module.exports = { classifyPhoto, classifyKondisiRumah, VALID_KONDISI, SEVERITY };
