const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/warga', require('./routes/warga'));
app.use('/api/admin', require('./routes/admin'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
