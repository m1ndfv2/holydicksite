import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import express from 'express';
import mysql from 'mysql2/promise';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 8080);

const mysqlConfig = {
  host: process.env.MYSQL_HOST || '150.241.70.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'authme',
  password: process.env.MYSQL_PASSWORD || 'F8mb4EDwlTjEQiaAKP',
  database: process.env.MYSQL_DATABASE || 'authme'
};

const mysqlTable = process.env.MYSQL_TABLE || 'authme';
const mysqlUsernameColumn = process.env.MYSQL_USERNAME_COLUMN || 'realname';
const mysqlPasswordColumn = process.env.MYSQL_PASSWORD_COLUMN || 'password';
const mysqlLastLoginColumn = process.env.MYSQL_LASTLOGIN_COLUMN || 'lastlogin';
const minecraftDatabase = process.env.MYSQL_MINECRAFT_DATABASE || 'minecraft';
const luckPermsTable = process.env.MYSQL_LUCKPERMS_TABLE || 'luckperms_players';
const luckPermsUuidColumn = process.env.MYSQL_LUCKPERMS_UUID_COLUMN || 'uuid';
const luckPermsUsernameColumn = process.env.MYSQL_LUCKPERMS_USERNAME_COLUMN || 'username';
const skinsTable = process.env.MYSQL_SKINS_TABLE || 'Skins';
const skinsIdentifierColumn = process.env.MYSQL_SKINS_IDENTIFIER_COLUMN || 'skin_identifier';
const srPlayerSkinTable = process.env.MYSQL_SR_PLAYER_SKIN_TABLE || 'sr_player_skin';
const sessionSecret = process.env.SESSION_SECRET || 'holydicksite-change-me';

const pool = mysql.createPool({
  ...mysqlConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(express.json());
app.use(cookieParser(sessionSecret));
app.use(express.static(__dirname));

function signSession(username) {
  const expires = String(Date.now() + 1000 * 60 * 60 * 24);
  const payload = `${username}.${expires}`;
  const sig = crypto.createHmac('sha256', sessionSecret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifySession(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [username, expires, signature] = parts;
  const payload = `${username}.${expires}`;
  const expected = crypto.createHmac('sha256', sessionSecret).update(payload).digest('hex');

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return null;
  if (!crypto.timingSafeEqual(expectedBuf, signatureBuf)) return null;
  if (Number(expires) < Date.now()) return null;

  return username;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function matchesAuthMeHash(password, hash) {
  if (!hash || typeof hash !== 'string') return false;

  if (password === hash) return true;

  if (hash.startsWith('$SHA$')) {
    const parts = hash.split('$');
    if (parts.length >= 4) {
      const salt = parts[2];
      const value = parts[3];
      return sha256(sha256(password) + salt) === value;
    }
  }

  if (/^[a-f0-9]{64}$/i.test(hash)) {
    return sha256(password) === hash.toLowerCase();
  }

  return false;
}

function normalizeLastLogin(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getUserByUsername(username) {
  const query = `SELECT \`${mysqlUsernameColumn}\` AS username, \`${mysqlPasswordColumn}\` AS password, \`${mysqlLastLoginColumn}\` AS lastLogin FROM \`${mysqlTable}\` WHERE \`${mysqlUsernameColumn}\` = ? LIMIT 1`;
  const [rows] = await pool.query(query, [username]);
  return rows[0] || null;
}

async function queryFirst(queries) {
  for (const q of queries) {
    try {
      const [rows] = await pool.query(q.sql, q.params || []);
      if (rows[0]) return rows[0];
    } catch (_) {
      // try next candidate schema
    }
  }
  return null;
}

function normalizeUuid(uuid) {
  if (!uuid) return null;
  return String(uuid).replace(/-/g, '').toLowerCase();
}

function withHyphens(uuid) {
  const clean = normalizeUuid(uuid);
  if (!clean || clean.length !== 32) return null;
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

async function resolveSkinHeadUrl(username) {
  const lpRow = await queryFirst([
    {
      sql: `SELECT \`${luckPermsUuidColumn}\` AS uuid FROM \`${minecraftDatabase}\`.\`${luckPermsTable}\` WHERE \`${luckPermsUsernameColumn}\` = ? LIMIT 1`,
      params: [username]
    },
    {
      sql: `SELECT \`${luckPermsUuidColumn}\` AS uuid FROM \`${luckPermsTable}\` WHERE \`${luckPermsUsernameColumn}\` = ? LIMIT 1`,
      params: [username]
    }
  ]);

  const playerUuid = normalizeUuid(lpRow?.uuid);
  if (!playerUuid) return null;

  const skinRow = await queryFirst([
    {
      sql: `SELECT skin_identifier FROM \`${minecraftDatabase}\`.\`${srPlayerSkinTable}\` WHERE player_uuid = ? LIMIT 1`,
      params: [playerUuid]
    },
    {
      sql: `SELECT skin_identifier FROM \`${minecraftDatabase}\`.\`${srPlayerSkinTable}\` WHERE uuid = ? LIMIT 1`,
      params: [withHyphens(playerUuid)]
    },
    {
      sql: `SELECT skin_uuid FROM \`${minecraftDatabase}\`.\`${srPlayerSkinTable}\` WHERE player_uuid = ? LIMIT 1`,
      params: [playerUuid]
    }
  ]);

  const skinIdentifier = skinRow?.skin_identifier || skinRow?.skin_uuid;

  if (skinIdentifier) {
    const licensedRow = await queryFirst([
      {
        sql: `SELECT username FROM \`${minecraftDatabase}\`.\`${skinsTable}\` WHERE \`${skinsIdentifierColumn}\` = ? LIMIT 1`,
        params: [skinIdentifier]
      },
      {
        sql: `SELECT player_name FROM \`${minecraftDatabase}\`.\`${skinsTable}\` WHERE \`${skinsIdentifierColumn}\` = ? LIMIT 1`,
        params: [skinIdentifier]
      },
      {
        sql: `SELECT nick FROM \`${minecraftDatabase}\`.\`${skinsTable}\` WHERE \`${skinsIdentifierColumn}\` = ? LIMIT 1`,
        params: [skinIdentifier]
      }
    ]);

    const licensedNick = licensedRow?.username || licensedRow?.player_name || licensedRow?.nick;
    if (licensedNick) {
      return `https://minotar.net/helm/${encodeURIComponent(licensedNick)}/48`;
    }
  }

  return `https://crafatar.com/avatars/${playerUuid}?size=48&overlay`;
}

async function buildAuthPayload(username) {
  const user = await getUserByUsername(username);
  return {
    username,
    lastLogin: normalizeLastLogin(user?.lastLogin),
    skinHeadUrl: await resolveSkinHeadUrl(username)
  };
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Введите логин и пароль.' });
  }

  try {
    const user = await getUserByUsername(username);
    if (!user || !matchesAuthMeHash(password, user.password)) {
      return res.status(401).json({ ok: false, message: 'Неверные данные для входа.' });
    }

    const token = signSession(user.username);
    res.cookie('hd_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24
    });

    const payload = await buildAuthPayload(user.username);
    return res.json({ ok: true, ...payload });
  } catch (_) {
    return res.status(500).json({ ok: false, message: 'Ошибка подключения к базе данных.' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('hd_session');
  res.json({ ok: true });
});

app.get('/api/session', async (req, res) => {
  const username = verifySession(req.cookies.hd_session);
  if (!username) return res.status(401).json({ ok: false });

  try {
    const payload = await buildAuthPayload(username);
    return res.json({ ok: true, ...payload });
  } catch (_) {
    return res.json({ ok: true, username, lastLogin: null, skinHeadUrl: null });
  }
});

app.listen(port, () => {
  console.log(`HolyDuck site running on :${port}`);
});
