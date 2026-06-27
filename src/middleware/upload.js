import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ApiError } from '../utils/apiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');

// Fayl turiga qarab papkani tanlaymiz.
function folderForMime(mimetype) {
  if (mimetype.startsWith('audio/')) return 'voice';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('image/')) return 'image';
  return 'file';
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = folderForMime(file.mimetype);
    const dir = path.join(uploadsRoot, folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

// Telegramga istalgan turdagi fayl yuborish mumkin (hujjat, rasm, ovoz, video...).
export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB (Telegram limiti)
});

// Yuklangan faylning URL manzilini qaytaradi (frontend shuni ishlatadi).
export function fileUrl(req, file) {
  const folder = folderForMime(file.mimetype);
  return `/uploads/${folder}/${file.filename}`;
}
