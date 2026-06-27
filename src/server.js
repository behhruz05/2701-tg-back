import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import { notFound, errorHandler } from './middleware/error.js';
import { setIO } from './sockets/io.js';
import { getClient, attachRealtime, roomKey } from './telegram/manager.js';

import tgAuthRoutes from './routes/tgAuthRoutes.js';
import tgRoutes from './routes/tgRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

// CORS — frontend (siz quradigan) shu serverga murojaat qiladi.
app.use(
  cors({
    origin: env.clientUrl === '*' ? true : [env.clientUrl, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Yuklangan fayllar (vaqtinchalik saqlanadi)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Sog'liq tekshiruvi
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'telegram-web (MTProto)', time: Date.now() });
});

// Swagger interaktiv hujjat: http://localhost:5987/api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// Telegram (haqiqiy) endpointlari
app.use('/api/tg/auth', tgAuthRoutes);
app.use('/api/tg', tgRoutes);

// Xatoliklar
app.use(notFound);
app.use(errorHandler);

// ---- Socket.IO: real-time yangi xabarlar ----
const io = new Server(server, {
  cors: { origin: env.clientUrl === '*' ? true : env.clientUrl, credentials: true },
});
setIO(io);

// Bitta socket bir nechta akkaunt (sessiya) ni kuzatishi mumkin.
// Frontend auth: { session } yoki { sessions: [s1, s2, ...] } yuboradi.
async function joinSessions(socket, sessions) {
  for (const session of sessions) {
    if (!session) continue;
    try {
      await getClient(session); // ulanganini kafolatlaymiz
      socket.join(roomKey(session)); // shu akkaunt xonasiga qo'shamiz
      attachRealtime(session, io); // yangi xabar handlerini ulaymiz
    } catch (err) {
      socket.emit('tg:error', { session: '***', message: err.message });
    }
  }
}

io.on('connection', async (socket) => {
  const auth = socket.handshake.auth || {};
  const query = socket.handshake.query || {};
  const sessions = auth.sessions || query.sessions || [auth.session || query.session];

  if (!sessions.filter(Boolean).length) {
    socket.emit('tg:error', { message: 'Sessiya yo\'q — real-time uchun login qiling' });
    return;
  }

  await joinSessions(socket, sessions);
  socket.emit('tg:ready');

  // Keyinchalik yangi akkaunt qo'shilsa, frontend shu event bilan ulashi mumkin.
  socket.on('tg:add-session', async (session) => {
    await joinSessions(socket, [session]);
    socket.emit('tg:ready');
  });

  socket.on('disconnect', () => {
    /* klientlarni ochiq qoldiramiz — boshqa tablar ham ishlatishi mumkin */
  });
});

server.listen(env.port, () => {
  console.log(`🚀 Telegram Web backend ishga tushdi: http://localhost:${env.port}`);
  if (!env.tgApiId || !env.tgApiHash) {
    console.log('ℹ️  Eslatma: TG_API_ID / TG_API_HASH .env da to\'ldirilishi kerak.');
  }
});

export { app, server };
