// server.js - Backend mínimo para CNE (versión corregida)
// Ejecutar: npm install && node server.js
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Config desde env
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_this';
const ADMIN_KEY = process.env.ADMIN_KEY || 'dev_admin_key';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || null;

// Data dir
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DELEG_FILE = path.join(DATA_DIR, 'delegaciones.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');

function readJSON(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || 'null') || defaultValue;
  } catch (err) {
    console.error('readJSON error', err);
    return defaultValue;
  }
}
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Inicializa archivos si faltan
readJSON(USERS_FILE, []);
readJSON(DELEG_FILE, {});
readJSON(NEWS_FILE, []);
readJSON(CONTACTS_FILE, []);

// Auth helpers
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No authorization header' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Bad auth format' });
  const payload = verifyToken(parts[1]);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  req.user = payload;
  next();
}

// --- Endpoints ---

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { username, password, adminKey } = req.body;
  if (adminKey) {
    if (adminKey === ADMIN_KEY) {
      const token = signToken({ role: 'admin', username: 'admin' });
      return res.json({ token, role: 'admin' });
    }
    return res.status(401).json({ error: 'Admin key inválida' });
  }
  if (!username || !password) return res.status(400).json({ error: 'username y password requeridos' });

  const users = readJSON(USERS_FILE, []);
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = signToken({ role: user.role || 'delegate', username: user.username, delegacion: user.delegacion });
  res.json({ token, role: user.role || 'delegate', delegacion: user.delegacion });
});

// POST /api/users (admin only)
app.post('/api/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin' });
  const { username, password, delegacion, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username y password requeridos' });
  const users = readJSON(USERS_FILE, []);
  if (users.some(u => u.username === username)) return res.status(400).json({ error: 'Usuario ya existe' });
  const passwordHash = await bcrypt.hash(password, 10);
  users.push({ username, passwordHash, delegacion: delegacion || null, role: role || 'delegate' });
  writeJSON(USERS_FILE, users);
  res.json({ ok: true });
});

// --- Delegaciones ---
// GET all delegaciones (público)
app.get('/api/delegaciones', (req, res) => {
  try {
    const delegs = readJSON(DELEG_FILE, {});
    res.json({ delegs });
  } catch (err) {
    console.error('Error leyendo delegaciones:', err);
    res.status(500).json({ error: 'Error leyendo delegaciones' });
  }
});

// GET una delegación por key (público)
app.get('/api/delegaciones/:key', (req, res) => {
  try {
    const delegs = readJSON(DELEG_FILE, {});
    const key = req.params.key;
    if (!delegs || !delegs[key]) {
      return res.status(404).json({ error: 'Delegación no encontrada' });
    }
    res.json({ delegacion: delegs[key] });
  } catch (err) {
    console.error('Error leyendo delegación:', err);
    res.status(500).json({ error: 'Error leyendo delegación' });
  }
});

// PUT update delegacion (admin o delegado propio)
app.put('/api/delegaciones/:key', authMiddleware, (req, res) => {
  const key = req.params.key;
  // Sólo admin o delegado de esa clave
  if (!(req.user.role === 'admin' || req.user.delegacion === key)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const delegs = readJSON(DELEG_FILE, {});
    delegs[key] = req.body.delegacionData;
    writeJSON(DELEG_FILE, delegs);
    res.json({ ok: true, delegacion: delegs[key] });
  } catch (err) {
    console.error('Error guardando delegación:', err);
    res.status(500).json({ error: 'Error guardando delegación' });
  }
});

// News endpoints
app.get('/api/news', (req, res) => {
  const news = readJSON(NEWS_FILE, []);
  res.json({ news });
});
app.put('/api/news/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin' });
  const id = req.params.id;
  const news = readJSON(NEWS_FILE, []);
  const item = req.body;
  if (id === 'new') {
    item.id = uuidv4();
    news.unshift(item);
  } else {
    const idx = news.findIndex(n => n.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    news[idx] = Object.assign(news[idx], item);
  }
  writeJSON(NEWS_FILE, news);
  res.json({ ok: true, news });
});

// Contact endpoint
app.post('/api/contact', async (req, res) => {
  const { nombre, correo, telefono, delegacion, mensaje } = req.body;
  if (!nombre || !correo || !mensaje) return res.status(400).json({ error: 'Campos requeridos: nombre, correo, mensaje' });

  const contacts = readJSON(CONTACTS_FILE, []);
  const entry = { id: uuidv4(), nombre, correo, telefono, delegacion, mensaje, created_at: new Date().toISOString() };
  contacts.unshift(entry);
  writeJSON(CONTACTS_FILE, contacts);

  if (CONTACT_EMAIL && process.env.SMTP_HOST) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: (process.env.SMTP_SECURE === 'true'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: `"CNE Web" <${process.env.SMTP_USER}>`,
        to: CONTACT_EMAIL,
        subject: `Nuevo contacto desde web: ${nombre}`,
        text: `Nombre: ${nombre}\nCorreo: ${correo}\nTeléfono: ${telefono}\nDelegación: ${delegacion}\n\nMensaje:\n${mensaje}`
      });
    } catch (err) {
      console.error('Error enviando email de contacto', err);
    }
  }

  res.json({ ok: true });
});

// Serve public static files (frontend)
const PUBLIC_DIR = path.join(__dirname, 'public');
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  // SPA fallback
  app.get('*', (req, res, next) => {
    // If request is for api, skip
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
} else {
  // Si no existe public, servir index.html desde root (solo dev)
  app.use(express.static(__dirname));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`CNE backend escuchando en http://localhost:${PORT}`);
  console.log(`Asegúrate de establecer JWT_SECRET y ADMIN_KEY en variables de entorno.`);
});