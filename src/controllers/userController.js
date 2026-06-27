import User from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/apiError.js';
import { fileUrl } from '../middleware/upload.js';

// @desc   Foydalanuvchilarni qidirish (username, ism, familiya bo'yicha)
// @route  GET /api/users/search?q=...
// Qidiruv "yaxshi" ishlashi uchun: prefiks moslik + reyting bo'yicha tartib.
export const searchUsers = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  if (!q) {
    return res.json({ users: [] });
  }

  // Maxsus regex belgilarini xavfsizlaymiz.
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = new RegExp(safe, 'i'); // katta-kichik harf farqsiz

  const users = await User.find({
    _id: { $ne: req.user._id }, // o'zini chiqarmaymiz
    $or: [{ username: rx }, { firstName: rx }, { lastName: rx }, { email: rx }],
  })
    .select('username firstName lastName avatar bio isOnline lastSeen')
    .limit(limit)
    .lean();

  // Reyting: aniq mos > boshidan mos > ichida mos. Onlaynlar yuqorida.
  const lower = q.toLowerCase();
  const score = (u) => {
    const uname = u.username.toLowerCase();
    const full = `${u.firstName} ${u.lastName}`.trim().toLowerCase();
    let s = 0;
    if (uname === lower) s += 100;
    else if (uname.startsWith(lower)) s += 50;
    else if (uname.includes(lower)) s += 20;
    if (full.startsWith(lower)) s += 40;
    else if (full.includes(lower)) s += 15;
    if (u.isOnline) s += 5;
    return s;
  };
  users.sort((a, b) => score(b) - score(a));

  res.json({ users });
});

// @desc   ID bo'yicha bitta foydalanuvchi
// @route  GET /api/users/:id
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'username firstName lastName avatar bio isOnline lastSeen'
  );
  if (!user) throw new ApiError(404, 'Foydalanuvchi topilmadi');
  res.json({ user });
});

// @desc   O'z profilini yangilash
// @route  PUT /api/users/me
export const updateMe = asyncHandler(async (req, res) => {
  const { firstName, lastName, bio } = req.body;
  const user = req.user;

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (bio !== undefined) user.bio = bio;

  // Agar avatar fayl yuborilgan bo'lsa
  if (req.file) user.avatar = fileUrl(req, req.file);

  await user.save();
  res.json({
    user: {
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    },
  });
});
