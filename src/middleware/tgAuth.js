import { getClient } from '../telegram/manager.js';
import { ApiError, asyncHandler } from '../utils/apiError.js';

// Har bir himoyalangan so'rovda Telegram sessiyasini tekshiramiz.
// Frontend sessiyani "x-tg-session" header da (yoki Authorization: Bearer) yuboradi.
export const tgProtect = asyncHandler(async (req, res, next) => {
  let session = req.headers['x-tg-session'];

  const auth = req.headers.authorization;
  if (!session && auth && auth.startsWith('Bearer ')) {
    session = auth.slice(7);
  }

  if (!session) {
    throw new ApiError(401, 'Sessiya yo\'q. Avval Telegramga login qiling.');
  }

  try {
    req.tgSession = session;
    req.client = await getClient(session);
  } catch (err) {
    throw new ApiError(401, 'Sessiya yaroqsiz yoki muddati tugagan: ' + err.message);
  }

  next();
});
