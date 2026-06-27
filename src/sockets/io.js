// Socket.IO instansiyasini bir joyda saqlaymiz, shunda controllerlar ham
// real-time event yubora oladi.
let ioInstance = null;

// userId -> socket.id larto'plami (bitta user bir nechta qurilmadan kirishi mumkin)
export const onlineUsers = new Map();

export function setIO(io) {
  ioInstance = io;
}

export function getIO() {
  if (!ioInstance) throw new Error('Socket.IO hali ishga tushmagan');
  return ioInstance;
}

// Suhbat (chat) xonasidagi hammaga event yuborish.
export function emitToChat(chatId, event, payload) {
  if (ioInstance) ioInstance.to(`chat:${chatId}`).emit(event, payload);
}

// Aniq bir userga (uning barcha qurilmalariga) event yuborish.
export function emitToUser(userId, event, payload) {
  if (ioInstance) ioInstance.to(`user:${userId}`).emit(event, payload);
}
