import { Router } from 'express';
import { tgProtect } from '../middleware/tgAuth.js';
import {
  sendCode,
  signIn,
  getMe,
  logout,
} from '../controllers/tgAuthController.js';

const router = Router();

// Login uchun sessiya kerak emas (hali yo'q).
router.post('/send-code', sendCode);
router.post('/sign-in', signIn);

// Sessiya talab qiladigan endpointlar.
router.get('/me', tgProtect, getMe);
router.post('/logout', tgProtect, logout);

export default router;
