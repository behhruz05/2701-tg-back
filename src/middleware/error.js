// Topilmagan route uchun
export function notFound(req, res, next) {
  res.status(404).json({ message: `Topilmadi - ${req.originalUrl}` });
}

// Umumiy xato ushlovchi. Hamma xato shu yerga keladi.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Serverda xatolik';

  // Mongoose duplicate (takror) xatosi: masalan username band
  if (err.code === 11000) {
    status = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'qiymat';
    message = `Bu ${field} allaqachon band`;
  }

  // Mongoose validatsiya xatosi
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // Noto'g'ri JWT
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Token noto\'g\'ri';
  }
  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token muddati tugagan, qaytadan kiring';
  }

  res.status(status).json({ message });
}
