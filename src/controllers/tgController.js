import { Api } from 'telegram';
import { ApiError, asyncHandler } from '../utils/apiError.js';
import {
  serializeDialog,
  serializeMessage,
  serializeUser,
} from '../telegram/serialize.js';

// chatId numerik id yoki @username bo'lishi mumkin. GramJS o'zi resolve qiladi.
function peer(req) {
  const id = req.params.chatId || req.body.chatId;
  if (!id) throw new ApiError(400, 'chatId majburiy');
  // Faqat raqamdan iborat bo'lsa BigInt sifatida ishlatamiz (aks holda string).
  return /^-?\d+$/.test(id) ? id : id;
}

// @desc   Barcha suhbatlar ro'yxati (chap paneldagi chatlar)
// @route  GET /api/tg/dialogs?limit=
export const getDialogs = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const dialogs = await req.client.getDialogs({ limit });
  res.json({ dialogs: dialogs.map(serializeDialog) });
});

// @desc   Bitta suhbatning xabarlari (sahifalab — eski xabarlarga skroll)
// @route  GET /api/tg/messages/:chatId?limit=&offsetId=
export const getMessages = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const offsetId = Number(req.query.offsetId) || 0;

  const messages = await req.client.getMessages(peer(req), { limit, offsetId });
  // Eskidan yangiga tartibda qaytaramiz.
  res.json({ messages: messages.map(serializeMessage).reverse() });
});

// @desc   Matnli xabar yuborish (yoki javob / forward bilan)
// @route  POST /api/tg/messages/:chatId   body: { text, replyTo? }
export const sendMessage = asyncHandler(async (req, res) => {
  const { text, replyTo } = req.body;
  if (!text || !text.trim()) throw new ApiError(400, 'text bo\'sh bo\'lmasligi kerak');

  const msg = await req.client.sendMessage(peer(req), {
    message: text,
    replyTo: replyTo ? Number(replyTo) : undefined,
  });
  res.status(201).json({ message: serializeMessage(msg) });
});

// @desc   Media (rasm/ovoz/video/fayl) yuborish
// @route  POST /api/tg/messages/:chatId/media  (multipart: field "media")
//   body: { caption?, voice?, videoNote?, replyTo? }
export const sendMedia = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'media fayl majburiy');
  const { caption, voice, videoNote, replyTo } = req.body;

  const msg = await req.client.sendFile(peer(req), {
    file: req.file.path,
    caption: caption || '',
    voiceNote: voice === 'true' || voice === true,
    videoNote: videoNote === 'true' || videoNote === true,
    replyTo: replyTo ? Number(replyTo) : undefined,
  });
  res.status(201).json({ message: serializeMessage(msg) });
});

// @desc   Xabarni o'qildi deb belgilash
// @route  POST /api/tg/messages/:chatId/read
export const markRead = asyncHandler(async (req, res) => {
  await req.client.markAsRead(peer(req));
  res.json({ message: 'O\'qildi deb belgilandi' });
});

// @desc   Xabarni tahrirlash
// @route  PUT /api/tg/messages/:chatId/:messageId   body: { text }
export const editMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) throw new ApiError(400, 'text majburiy');
  const msg = await req.client.editMessage(peer(req), {
    message: Number(req.params.messageId),
    text,
  });
  res.json({ message: serializeMessage(msg) });
});

// @desc   Xabar(lar)ni o'chirish
// @route  DELETE /api/tg/messages/:chatId   body: { messageIds: [], revoke? }
export const deleteMessages = asyncHandler(async (req, res) => {
  const { messageIds, revoke } = req.body;
  if (!Array.isArray(messageIds) || !messageIds.length) {
    throw new ApiError(400, 'messageIds (massiv) majburiy');
  }
  await req.client.deleteMessages(
    peer(req),
    messageIds.map(Number),
    { revoke: revoke !== false } // default: hamma uchun o'chirish
  );
  res.json({ message: 'O\'chirildi', messageIds });
});

// @desc   Xabar(lar)ni boshqa suhbatga forward qilish
// @route  POST /api/tg/messages/:chatId/forward   body: { toChatId, messageIds: [] }
export const forwardMessages = asyncHandler(async (req, res) => {
  const { toChatId, messageIds } = req.body;
  if (!toChatId || !Array.isArray(messageIds) || !messageIds.length) {
    throw new ApiError(400, 'toChatId va messageIds majburiy');
  }
  const result = await req.client.forwardMessages(toChatId, {
    messages: messageIds.map(Number),
    fromPeer: peer(req),
  });
  res.json({ messages: (result || []).map(serializeMessage) });
});

// @desc   Xabarga reaksiya qo'yish (emoji)
// @route  POST /api/tg/messages/:chatId/:messageId/react   body: { emoji }
export const reactToMessage = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const reaction = emoji
    ? [new Api.ReactionEmoji({ emoticon: emoji })]
    : []; // bo'sh = reaksiyani olib tashlash

  await req.client.invoke(
    new Api.messages.SendReaction({
      peer: peer(req),
      msgId: Number(req.params.messageId),
      reaction,
    })
  );
  res.json({ message: 'Reaksiya yangilandi' });
});

// @desc   Xabarni qadash (pin)
// @route  POST /api/tg/messages/:chatId/:messageId/pin   body: { unpin? }
export const pinMessage = asyncHandler(async (req, res) => {
  const msgId = Number(req.params.messageId);
  if (req.body.unpin) {
    await req.client.unpinMessage(peer(req), msgId);
  } else {
    await req.client.pinMessage(peer(req), msgId);
  }
  res.json({ message: req.body.unpin ? 'Pin olib tashlandi' : 'Qadaldi' });
});

// @desc   Suhbat ichida xabar qidirish
// @route  GET /api/tg/messages/:chatId/search?q=&limit=
export const searchMessages = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ messages: [] });
  const limit = Math.min(Number(req.query.limit) || 30, 100);

  const messages = await req.client.getMessages(peer(req), { search: q, limit });
  res.json({ messages: messages.map(serializeMessage) });
});

// @desc   Global qidiruv (kontakt / suhbat / xabar)
// @route  GET /api/tg/search?q=
export const globalSearch = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ users: [], chats: [] });

  const result = await req.client.invoke(
    new Api.contacts.Search({ q, limit: 20 })
  );
  res.json({
    users: (result.users || []).map(serializeUser),
    chats: (result.chats || []).map((c) => ({
      id: String(c.id),
      name: c.title || '',
      username: c.username || '',
    })),
  });
});

// @desc   Kontaktlar ro'yxati
// @route  GET /api/tg/contacts
export const getContacts = asyncHandler(async (req, res) => {
  const result = await req.client.invoke(new Api.contacts.GetContacts({ hash: 0 }));
  res.json({ contacts: (result.users || []).map(serializeUser) });
});

// @desc   Suhbat (guruh/kanal) a'zolari
// @route  GET /api/tg/chats/:chatId/members?limit=
export const getMembers = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const members = await req.client.getParticipants(peer(req), { limit });
  res.json({ members: members.map(serializeUser) });
});

// @desc   Foydalanuvchi/suhbat ma'lumotini olish
// @route  GET /api/tg/entity/:chatId
export const getEntity = asyncHandler(async (req, res) => {
  const entity = await req.client.getEntity(peer(req));
  res.json({ entity: serializeUser(entity) });
});

// @desc   Media faylni yuklab olib, brauzerga uzatish
// @route  GET /api/tg/messages/:chatId/:messageId/file
export const downloadFile = asyncHandler(async (req, res) => {
  const messages = await req.client.getMessages(peer(req), {
    ids: [Number(req.params.messageId)],
  });
  const msg = messages?.[0];
  if (!msg || !msg.media) throw new ApiError(404, 'Media topilmadi');

  const buffer = await req.client.downloadMedia(msg, {});
  if (!buffer) throw new ApiError(404, 'Faylni yuklab bo\'lmadi');

  res.set('Content-Type', msg.media?.document?.mimeType || 'application/octet-stream');
  res.send(buffer);
});

// @desc   "Yozyapti..." holatini yuborish
// @route  POST /api/tg/messages/:chatId/typing
export const sendTyping = asyncHandler(async (req, res) => {
  await req.client.invoke(
    new Api.messages.SetTyping({
      peer: peer(req),
      action: new Api.SendMessageTypingAction(),
    })
  );
  res.json({ ok: true });
});
