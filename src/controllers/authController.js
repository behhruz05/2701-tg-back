import User from '../models/User.js';
import Chat from '../models/Chat.js';
import { signToken } from '../utils/token.js';
import { ApiError, asyncHandler } from '../utils/apiError.js';

// Foydalanuvchi ma'lumotini parolsiz qaytaramiz.
export function publicUser(user) {
  return {
    _id: user._id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    bio: user.bio,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    privacy: user.privacy,
    settings: user.settings,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}

// @desc   Ro'yxatdan o'tish
// @route  POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { username, firstName, lastName, email, phone, password } = req.body;

  if (!username || !firstName || !email || !password) {
    throw new ApiError(400, 'username, firstName, email va password majburiy');
  }

  const exists = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });
  if (exists) {
    throw new ApiError(400, 'Bu username yoki email allaqachon band');
  }

  const user = await User.create({ username, firstName, lastName, email, phone, password });

  // Har bir userga avtomatik "Saved Messages" chati ochamiz.
  await Chat.create({ type: 'saved', members: [user._id], owner: user._id });

  const token = signToken(user._id);
  res.status(201).json({ token, user: publicUser(user) });
});

// @desc   Tizimga kirish
// @route  POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { login, password } = req.body; // login = username yoki email

  if (!login || !password) {
    throw new ApiError(400, 'login (username yoki email) va password majburiy');
  }

  const user = await User.findOne({
    $or: [{ email: login.toLowerCase() }, { username: login.toLowerCase() }],
  }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Login yoki parol noto\'g\'ri');
  }

  const token = signToken(user._id);
  res.json({ token, user: publicUser(user) });
});

// @desc   Hozirgi foydalanuvchi ma'lumoti
// @route  GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// @desc   Parolni o'zgartirish
// @route  PUT /api/auth/password   body: { currentPassword, newPassword }
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'currentPassword va newPassword majburiy');
  }
  if (newPassword.length < 6) {
    throw new ApiError(400, 'Yangi parol kamida 6 ta belgidan iborat bo\'lsin');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) {
    throw new ApiError(401, 'Joriy parol noto\'g\'ri');
  }

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Parol yangilandi' });
});

// @desc   Tizimdan chiqish (offline qilamiz; token frontda o'chiriladi)
// @route  POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  req.user.isOnline = false;
  req.user.lastSeen = new Date();
  await req.user.save();
  res.json({ message: 'Tizimdan chiqdingiz' });
});
