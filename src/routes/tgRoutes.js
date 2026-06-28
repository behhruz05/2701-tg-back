import { Router } from 'express';
import { tgProtect } from '../middleware/tgAuth.js';
import { upload } from '../middleware/upload.js';
import {
  getDialogs,
  getMessages,
  sendMessage,
  sendMedia,
  markRead,
  editMessage,
  deleteMessages,
  forwardMessages,
  reactToMessage,
  pinMessage,
  searchMessages,
  globalSearch,
  getContacts,
  getMembers,
  getEntity,
  getAvatar,
  downloadFile,
  sendTyping,
} from '../controllers/tgController.js';

const router = Router();

// Hamma endpoint sessiya (login) talab qiladi.
router.use(tgProtect);

// Suhbatlar ro'yxati
router.get('/dialogs', getDialogs);

// Global qidiruv va kontaktlar
router.get('/search', globalSearch);
router.get('/contacts', getContacts);

// Bitta entity (user/chat) ma'lumoti
router.get('/entity/:chatId', getEntity);

// Profil rasmi (avatar)
router.get('/avatar/:chatId', getAvatar);

// Suhbat a'zolari
router.get('/chats/:chatId/members', getMembers);

// Xabarlar
router.get('/messages/:chatId', getMessages);
router.get('/messages/:chatId/search', searchMessages);
router.post('/messages/:chatId', sendMessage);
router.post('/messages/:chatId/media', upload.single('media'), sendMedia);
router.post('/messages/:chatId/read', markRead);
router.post('/messages/:chatId/typing', sendTyping);
router.post('/messages/:chatId/forward', forwardMessages);
router.delete('/messages/:chatId', deleteMessages);
router.put('/messages/:chatId/:messageId', editMessage);
router.post('/messages/:chatId/:messageId/react', reactToMessage);
router.post('/messages/:chatId/:messageId/pin', pinMessage);
router.get('/messages/:chatId/:messageId/file', downloadFile);

export default router;
