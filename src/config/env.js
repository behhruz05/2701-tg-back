import dotenv from 'dotenv';

dotenv.config();

// Hamma muhit (environment) o'zgaruvchilari shu yerda bir joyda turadi.
export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Telegram MTProto ilova kalitlari (my.telegram.org dan olinadi).
  // Bularsiz haqiqiy Telegramga ulanib bo'lmaydi.
  tgApiId: Number(process.env.TG_API_ID) || 0,
  tgApiHash: process.env.TG_API_HASH || '',

  // Sessiya stringini imzolash uchun (ixtiyoriy maxfiy kalit).
  jwtSecret: process.env.JWT_SECRET || 'tg_web_dev_secret',
};

// Telegram kalitlari bo'lmasa ogohlantiramiz (lekin serverni o'chirmaymiz —
// foydalanuvchi keyin .env ni to'ldirishi mumkin).
if (!env.tgApiId || !env.tgApiHash) {
  console.warn(
    '⚠️  TG_API_ID / TG_API_HASH .env faylda yo\'q.\n' +
      '   https://my.telegram.org → API development tools dan oling va .env ga qo\'shing.'
  );
}
