import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { ApiError, asyncHandler } from '../utils/apiError.js';
import { fileUrl } from '../middleware/upload.js';
import { emitToChat } from '../sockets/io.js';

const senderPopulate = {
  path: 'sender',
  select: 'username firstName lastName avatar',
};

// User suhbat a'zosimi tekshiramiz.
async function assertMember(chatId, userId) {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Suhbat topilmadi');
  if (!chat.members.some((m) => String(m) === String(userId))) {
    throw new ApiError(403, 'Siz bu suhbat a\'zosi emassiz');
  }
  return chat;
}

// @desc   Xabar yuborish (matn yoki media: ovoz / dumaloq video / rasm)
// @route  POST /api/chats/:chatId/messages
//   - Matn uchun:  body { text }
//   - Media uchun: multipart/form-data, field "media", body { type, duration }
export const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const chat = await assertMember(chatId, req.user._id);

  let { type, text, duration } = req.body;
  let mediaUrl = '';

  if (req.file) {
    mediaUrl = fileUrl(req, req.file);
    // type yuborilmagan bo'lsa fayl turidan aniqlaymiz
    if (!type) {
      if (req.file.mimetype.startsWith('audio/')) type = 'voice';
      else if (req.file.mimetype.startsWith('video/')) type = 'video_note';
      else if (req.file.mimetype.startsWith('image/')) type = 'image';
      else type = 'file';
    }
  } else {
    type = 'text';
    if (!text || !text.trim()) throw new ApiError(400, 'Bo\'sh xabar yuborib bo\'lmaydi');
  }

  let message = await Message.create({
    chat: chatId,
    sender: req.user._id,
    type,
    text: text || '',
    mediaUrl,
    duration: Number(duration) || 0,
    readBy: [req.user._id],
  });

  // Chatning oxirgi xabarini yangilaymiz (chat ro'yxati uchun).
  chat.lastMessage = message._id;
  await chat.save();

  message = await message.populate(senderPopulate);

  // Real-time: suhbatdagi hammaga yuboramiz.
  emitToChat(chatId, 'message:new', message);

  res.status(201).json({ message });
});

// @desc   Suhbat xabarlarini olish (sahifalab)
// @route  GET /api/chats/:chatId/messages?limit=&before=
export const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  await assertMember(chatId, req.user._id);

  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const filter = { chat: chatId };

  // "before" — undan oldingi xabarlarni olish (eski xabarlarga skroll).
  if (req.query.before) {
    filter.createdAt = { $lt: new Date(req.query.before) };
  }

  const messages = await Message.find(filter)
    .populate(senderPopulate)
    .sort({ createdAt: -1 })
    .limit(limit);

  // Eskidan yangiga tartibda qaytaramiz.
  res.json({ messages: messages.reverse() });
});

// @desc   Xabarlarni o'qildi deb belgilash
// @route  PUT /api/chats/:chatId/messages/read
export const markRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  await assertMember(chatId, req.user._id);

  await Message.updateMany(
    { chat: chatId, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  emitToChat(chatId, 'message:read', {
    chatId,
    userId: String(req.user._id),
  });

  res.json({ message: 'O\'qildi deb belgilandi' });
});
