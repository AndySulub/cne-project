// Script para crear usuario en data/users.json con password hasheado
// Uso: node scripts/create-user.js --username user --password pass --role delegate --delegacion PETO
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const args = require('minimist')(process.argv.slice(2));
const username = args.username;
const password = args.password;
const role = args.role || 'delegate';
const delegacion = args.delegacion || null;

if (!username || !password) {
  console.error('Usage: node scripts/create-user.js --username user --password pass [--role admin|delegate] [--delegacion KEY]');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Safe reader: handles missing, empty or invalid JSON by returning []
function safeReadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Warning: invalid JSON in ${filePath}, reinitializing to [].`);
    return [];
  }
}

const users = safeReadJSON(USERS_FILE);

if (users.some(u => u.username === username)) {
  console.error('Usuario ya existe:', username);
  process.exit(1);
}

(async () => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    users.push({ username, passwordHash, delegacion, role });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    console.log('Usuario creado:', username);
  } catch (err) {
    console.error('Error creando usuario:', err);
    process.exit(1);
  }
})();