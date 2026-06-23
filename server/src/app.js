const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
// Absolute path so foto tetap tersaji apa pun working directory saat server
// dijalankan (mis. `node src/index.js` dari root vs `npm start` dari server/).
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/warga', require('./routes/warga'));
app.use('/api/admin', require('./routes/admin'));

// Deployment satu-layanan: backend sekalian menyajikan hasil build frontend
// (web/dist). Folder ini hanya ada setelah `npm run build` di web/, jadi saat
// dev/test (folder belum ada) blok ini dilewati dan tidak mengubah perilaku.
const webDist = path.join(__dirname, '..', '..', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  // SPA fallback: kembalikan index.html untuk route non-API agar React Router
  // menangani navigasi sisi-klien.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
