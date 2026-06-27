import {
  startLogin,
  completeLogin,
  logout as tgLogout,
  serializeMe,
} from '../telegram/manager.js';
import { ApiError, asyncHandler } from '../utils/apiError.js';

// @desc   1-bosqich: telefon raqamga tasdiqlash kodi yuborish
// @route  POST /api/tg/auth/send-code   body: { phone, apiId?, apiHash? }
export const sendCode = asyncHandler(async (req, res) => {
  const { phone, apiId, apiHash } = req.body;
  if (!phone) throw new ApiError(400, 'phone (telefon raqam) majburiy, masalan +998901234567');

  const { loginId } = await startLogin({ apiId, apiHash, phone });
  res.json({ loginId, message: 'Tasdiqlash kodi Telegram ilovasiga yuborildi' });
});

// @desc   2-bosqich: kod (va kerak bo'lsa 2FA parol) bilan kirish
// @route  POST /api/tg/auth/sign-in   body: { loginId, code, password? }
export const signIn = asyncHandler(async (req, res) => {
  const { loginId, code, password } = req.body;
  if (!loginId) throw new ApiError(400, 'loginId majburiy (send-code dan keladi)');
  if (!code && !password) throw new ApiError(400, 'code majburiy');

  const result = await completeLogin({ loginId, code, password });

  // 2FA parol kerak bo'lsa, frontga shuni bildiramiz.
  if (result.needPassword) {
    return res.json({ needPassword: true, message: '2 bosqichli parolingizni kiriting' });
  }

  // Muvaffaqiyatli: session string frontga beriladi (u keyingi so'rovlarda qaytariladi).
  res.json({ session: result.session, user: result.user });
});

// @desc   Hozirgi (login bo'lgan) Telegram foydalanuvchisi
// @route  GET /api/tg/auth/me
export const getMe = asyncHandler(async (req, res) => {
  const me = await req.client.getMe();
  res.json({ user: serializeMe(me) });
});

// @desc   Tizimdan chiqish (sessiyani Telegramdan o'chiradi)
// @route  POST /api/tg/auth/logout
export const logout = asyncHandler(async (req, res) => {
  await tgLogout(req.tgSession);
  res.json({ message: 'Telegramdan chiqdingiz' });
});
