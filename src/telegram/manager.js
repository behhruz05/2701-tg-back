import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import { computeCheck } from 'telegram/Password.js';
import crypto from 'crypto';
import { env } from '../config/env.js';

// Login jarayonida (kod kutilayotgan) klientlar: loginId -> { client, ... }
const pendingLogins = new Map();

// To'liq ulangan (login bo'lgan) klientlar: sessionKey -> { client, handlersAttached }
// sessionKey = session stringining hashi (xavfsizlik uchun kalit sifatida).
const activeClients = new Map();

function keyOf(sessionString) {
  return crypto.createHash('sha256').update(sessionString).digest('hex');
}

function makeClient(sessionString, apiId, apiHash) {
  return new TelegramClient(new StringSession(sessionString || ''), apiId, apiHash, {
    // WebSocket (443-port) orqali ulanamiz — sekin/throttle tarmoqlarda (UZ)
    // TCPFull (80-port) ko'pincha bloklanadi, WSS esa HTTPS ga o'xshaydi.
    useWSS: true,
    connectionRetries: 5,
    retryDelay: 1000,
    timeout: 20, // sekund — so'rov shuncha kutib javob bermasa, xato beradi
    requestRetries: 3,
    autoReconnect: true,
    floodSleepThreshold: 60,
    useWALMode: false,
  });
}

// 1-bosqich: telefon raqamga kod yuborish. Vaqtinchalik klient ochiladi.
export async function startLogin({ apiId, apiHash, phone }) {
  apiId = apiId || env.tgApiId;
  apiHash = apiHash || env.tgApiHash;
  if (!apiId || !apiHash) {
    throw new Error('TG_API_ID / TG_API_HASH topilmadi (.env yoki so\'rovda yuboring)');
  }

  const client = makeClient('', apiId, apiHash);
  await client.connect();

  const { phoneCodeHash } = await client.sendCode({ apiId, apiHash }, phone);

  const loginId = crypto.randomUUID();
  pendingLogins.set(loginId, { client, phoneCodeHash, phone, apiId, apiHash });

  // 5 daqiqada tugamagan loginni tozalaymiz.
  setTimeout(() => {
    const p = pendingLogins.get(loginId);
    if (p) {
      p.client.disconnect().catch(() => {});
      pendingLogins.delete(loginId);
    }
  }, 5 * 60 * 1000);

  return { loginId };
}

// 2-bosqich: kod (va kerak bo'lsa 2FA parol) bilan tizimga kirish.
// Natija: { session, user } yoki { needPassword: true }.
export async function completeLogin({ loginId, code, password }) {
  const pending = pendingLogins.get(loginId);
  if (!pending) throw new Error('Login muddati tugagan yoki topilmadi. Qaytadan boshlang.');

  const { client, phoneCodeHash, phone } = pending;

  try {
    if (code) {
      await client.invoke(
        new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash, phoneCode: code })
      );
    } else if (password) {
      // Faqat parol bosqichi (kod oldin yuborilgan).
      const pwd = await client.invoke(new Api.account.GetPassword());
      const check = await computeCheck(pwd, password);
      await client.invoke(new Api.auth.CheckPassword({ password: check }));
    } else {
      throw new Error('code yoki password kerak');
    }
  } catch (err) {
    // 2FA parol kerak bo'lsa
    if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      if (!password) {
        return { needPassword: true };
      }
      const pwd = await client.invoke(new Api.account.GetPassword());
      const check = await computeCheck(pwd, password);
      await client.invoke(new Api.auth.CheckPassword({ password: check }));
    } else {
      throw err;
    }
  }

  // Muvaffaqiyatli — sessiyani saqlab, aktiv klientlar ro'yxatiga o'tkazamiz.
  const session = client.session.save();
  pendingLogins.delete(loginId);
  activeClients.set(keyOf(session), { client, handlersAttached: false });

  const me = await client.getMe();
  return { session, user: serializeMe(me) };
}

// Session string bo'yicha ulangan klientni qaytaradi (kerak bo'lsa qayta ulaydi).
export async function getClient(sessionString, { apiId, apiHash } = {}) {
  if (!sessionString) throw new Error('Sessiya topilmadi. Avval login qiling.');

  const k = keyOf(sessionString);
  const cached = activeClients.get(k);
  if (cached && cached.client.connected) return cached.client;

  const client = cached?.client || makeClient(sessionString, apiId || env.tgApiId, apiHash || env.tgApiHash);
  if (!client.connected) await client.connect();

  if (!(await client.checkAuthorization?.().catch(() => true))) {
    // checkAuthorization mavjud bo'lmasa e'tiborsiz qoldiramiz.
  }

  activeClients.set(k, { client, handlersAttached: cached?.handlersAttached || false });
  return client;
}

// Real-time: yangi xabarlar kelganda socket orqali frontga yuboramiz.
export function attachRealtime(sessionString, io) {
  const k = keyOf(sessionString);
  const entry = activeClients.get(k);
  if (!entry || entry.handlersAttached) return;

  const { client } = entry;
  client.addEventHandler(async (event) => {
    try {
      const msg = event.message;
      io.to(`tg:${k}`).emit('tg:message:new', await serializeMessage(client, msg));
    } catch {
      /* e'tiborsiz */
    }
  }, new NewMessage({}));

  entry.handlersAttached = true;
}

export function roomKey(sessionString) {
  return `tg:${keyOf(sessionString)}`;
}

// Tizimdan chiqish: sessiyani Telegramdan o'chirib, klientni yopamiz.
export async function logout(sessionString) {
  const k = keyOf(sessionString);
  const entry = activeClients.get(k);
  if (entry) {
    try {
      await entry.client.invoke(new Api.auth.LogOut());
    } catch {
      /* e'tiborsiz */
    }
    await entry.client.disconnect().catch(() => {});
    activeClients.delete(k);
  }
}

// ---- Serializatsiya yordamchilari (BigInt id larni stringga aylantiramiz) ----

export function serializeMe(me) {
  return {
    id: String(me.id),
    firstName: me.firstName || '',
    lastName: me.lastName || '',
    username: me.username || '',
    phone: me.phone || '',
    premium: !!me.premium,
  };
}

// serializeMessage manager ichida ham kerak (real-time uchun).
async function serializeMessage(client, msg) {
  const { serializeMessage: ser } = await import('./serialize.js');
  return ser(msg);
}
