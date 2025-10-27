/**
 * server.js
 * Backend mínimo listo para desplegar en Render/Heroku.
 *
 * - Usa process.env.PORT (necesario para hosts)
 * - Lee JWT_SECRET y ADMIN_KEY desde variables de entorno
 * - Sirve /public como archivos estáticos
 * - Rutas de ejemplo: /api/status, /api/login (genera JWT con ADMIN_KEY), /api/admin (protegida)
 */

require('dotenv').config(); // Solo para desarrollo local con .env (no subir .env al repo)
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Middlewares básicos
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// CORS: por defecto permite todo; en producción ajusta FRONTEND_ORIGIN en env
const allowedOrigin = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true,
}));

// Rate limiter básico
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de peticiones por IP por ventana
});
app.use('/api/', apiLimiter);

// Servir archivos estáticos desde /public
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de ejemplo
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    service: 'CNE backend',
    timestamp: new Date().toISOString()
  });
});

/**
 * /api/login
 * - Validación simple con ADMIN_KEY (ejemplo para obtener un JWT)
 */
app.post('/api/login',
  body('key').isString().notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const provided = req.body.key;
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) {
      return res.status(500).json({ ok: false, message: 'ADMIN_KEY no configurada en el servidor' });
    }

    if (provided !== adminKey) {
      return res.status(401).json({ ok: false, message: 'Clave inválida' });
    }

    const payload = {
      sub: uuidv4(),
      role: 'admin'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev_jwt_secret', { expiresIn: '6h' });

    return res.json({ ok: true, token });
  }
);

// Middleware de autenticación JWT simple
function authenticateJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Token not provided' });
  }
  const token = auth.slice(7);
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Token inválido o expirado' });
  }
}

// Ruta protegida de ejemplo
app.get('/api/admin', authenticateJWT, (req, res) => {
  res.json({ ok: true, message: 'Acceso concedido a área administrativa', user: req.user });
});

// Si es SPA: devolver index.html para rutas no encontradas que acepten HTML
app.get('*', (req, res, next) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Escucha en el puerto provisto por el host o 4000 por defecto
const PORT = process.env.PORT || 4000;

if (!process.env.JWT_SECRET || !process.env.ADMIN_KEY) {
  console.warn('Aviso: faltan variables de entorno JWT_SECRET o ADMIN_KEY. Configúralas en el host.');
}

app.listen(PORT, () => {
  console.log(`CNE backend escuchando en http://localhost:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
});
