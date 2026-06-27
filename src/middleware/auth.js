import { verifyToken } from '../utils/token.js';
import { ApiError, asyncHandler } from '../utils/apiError.js';
import User from '../models/User.js';

// Har bir himoyalangan route da tokenni tekshiramiz.
// Token "Authorization: Bearer <token>" ko'rinishida keladi.
export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Token yo\'q, avval tizimga kiring');
  }

  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, 'Bu token egasi topilmadi');
  }

  req.user = user;
  next();
});
