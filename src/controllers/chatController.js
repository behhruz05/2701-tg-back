import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/apiError.js';

const memberPopulate = {
  path: 'members',
  select: 'username firstName lastName avatar isOnline lastSeen',
};
const lastMsgPopulate = { path: 'lastMessage' };

// @desc   1-1 suhbat ochish (yoki mavjudini olish)
// @route  POST /api/chats/private   body: { userId }
export const openPrivateChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) throw new ApiError(400, 'userId majburiy');
  if (userId === String(req.user._id)) {
    throw new ApiError(400, 'O\'zingiz bilan suhbat ochib bo\'lmaydi');
  }

  const other = await User.findById(userId);
  if (!other) throw new ApiError(404, 'Foydalanuvchi topilmadi');

  // Allaqachon mavjud bo'lsa o'shani qaytaramiz.
  let chat = await Chat.findOne({
    isGroup: false,
    members: { $all: [req.user._id, userId], $size: 2 },
  })
    .populate(memberPopulate)
    .populate(lastMsgPopulate);

  if (!chat) {
    chat = await Chat.create({
      isGroup: false,
      members: [req.user._id, userId],
    });
    chat = await chat.populate(memberPopulate);
  }

  res.status(201).json({ chat });
});

// @desc   Guruh yaratish
// @route  POST /api/chats/group   body: { name, memberIds: [] }
export const createGroup = asyncHandler(async (req, res) => {
  const { name, memberIds } = req.body;
  if (!name || !Array.isArray(memberIds) || memberIds.length < 1) {
    throw new ApiError(400, 'name va kamida 1 a\'zo (memberIds) kerak');
  }

  // O'zini ham qo'shamiz va admin qilamiz.
  const members = Array.from(new Set([...memberIds, String(req.user._id)]));

  let chat = await Chat.create({
    isGroup: true,
    name,
    members,
    admins: [req.user._id],
  });
  chat = await chat.populate(memberPopulate);

  res.status(201).json({ chat });
});

// @desc   Mening barcha suhbatlarim
// @route  GET /api/chats
export const getMyChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ members: req.user._id })
    .populate(memberPopulate)
    .populate(lastMsgPopulate)
    .sort({ updatedAt: -1 });

  res.json({ chats });
});

// @desc   Bitta suhbatni olish
// @route  GET /api/chats/:id
export const getChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id)
    .populate(memberPopulate)
    .populate(lastMsgPopulate);
  if (!chat) throw new ApiError(404, 'Suhbat topilmadi');

  const isMember = chat.members.some((m) => String(m._id) === String(req.user._id));
  if (!isMember) throw new ApiError(403, 'Siz bu suhbat a\'zosi emassiz');

  res.json({ chat });
});

// @desc   Guruhga a'zo qo'shish
// @route  POST /api/chats/:id/members   body: { userId }
export const addMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const chat = await Chat.findById(req.params.id);
  if (!chat || !chat.isGroup) throw new ApiError(404, 'Guruh topilmadi');

  if (!chat.admins.some((a) => String(a) === String(req.user._id))) {
    throw new ApiError(403, 'Faqat admin a\'zo qo\'sha oladi');
  }

  if (!chat.members.some((m) => String(m) === String(userId))) {
    chat.members.push(userId);
    await chat.save();
  }
  const populated = await chat.populate(memberPopulate);
  res.json({ chat: populated });
});
