// Dumaloq video xabar (video note) uchun video konvertatsiyasi.
// Brauzer ko'pincha webm yozadi va kvadrat bo'lmaydi — Telegram esa dumaloq
// xabarni faqat kvadrat (w==h) H.264/mp4 sifatida qabul qiladi. Shu sabab
// ffmpeg bilan markazdan kvadrat qirqib, mp4 (h264/aac) ga o'tkazamiz.

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegPath from 'ffmpeg-static';

// Telegram dumaloq xabar uzunligi 60 soniya bilan cheklangan.
const MAX_DURATION = 60;

// stderr dan "Duration: 00:00:05.30" ni ajratib, soniyaga aylantiramiz.
function parseDuration(stderr) {
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  return Math.round(+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]));
}

/**
 * Istalgan videoni kvadrat mp4 (dumaloq video note) ga o'tkazadi.
 * @param {string} inputPath  yuklangan fayl yo'li
 * @param {number} side       kvadrat tomoni (px), default 384
 * @returns {Promise<{ path: string, duration: number, side: number }>}
 */
export function toRoundMp4(inputPath, side = 384) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('ffmpeg topilmadi (ffmpeg-static)'));

    const outPath = path.join(
      path.dirname(inputPath),
      `${path.basename(inputPath, path.extname(inputPath))}-round.mp4`
    );

    const args = [
      '-y',
      '-i', inputPath,
      // Markazdan kvadrat qirqib, kerakli o'lchamga keltiramiz.
      '-vf', `crop='min(iw,ih)':'min(iw,ih)',scale=${side}:${side},setsar=1`,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '64k',
      '-movflags', '+faststart',
      '-t', String(MAX_DURATION), // 60 soniyadan oshmasin
      outPath,
    ];

    let stderr = '';
    const proc = spawn(ffmpegPath, args);
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error('Video konvertatsiya xatosi:\n' + stderr.slice(-500)));
      }
      const duration = Math.min(parseDuration(stderr) || 0, MAX_DURATION);
      resolve({ path: outPath, duration, side });
    });
  });
}

// Vaqtinchalik fayl(lar)ni o'chiramiz (xatoni e'tiborsiz qoldiramiz).
export function safeUnlink(...files) {
  for (const f of files) {
    if (f) fs.promises.unlink(f).catch(() => {});
  }
}
