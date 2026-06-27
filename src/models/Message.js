import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
  },
  { _id: false, timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Xabar turi: matn, ovozli, dumaloq video, rasm, video, fayl, sticker, gif, joylashuv, kontakt, poll
    type: {
      type: String,
      enum: [
        'text',
        'voice',
        'video_note',
        'image',
        'video',
        'file',
        'sticker',
        'gif',
        'location',
        'contact',
        'poll',
        'system',
      ],
      default: 'text',
    },

    // Matnli xabar uchun
    text: { type: String, default: '' },

    // Media (ovoz/video/rasm/fayl) uchun
    mediaUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    duration: { type: Number, default: 0 }, // ovoz/video uzunligi (sekund)

    // Joylashuv (location) uchun
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // Javob (reply) — qaysi xabarga javob berilgan
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

    // Forward (qayta yuborilgan) — asl manba
    forwardFrom: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    },

    // Reaksiyalar (emoji)
    reactions: [reactionSchema],

    // Kim o'qigan
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Tahrirlangan vaqti (null bo'lsa tahrirlanmagan)
    editedAt: { type: Date, default: null },

    // Qadalgan (pinned) xabarmi
    isPinned: { type: Boolean, default: false },

    // Hamma uchun o'chirilganmi (matn/media yashiriladi, "deleted" ko'rinadi)
    isDeleted: { type: Boolean, default: false },

    // Faqat ayrim foydalanuvchilar uchun o'chirilgan (delete for me)
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // O'zini-o'zi yo'q qiladigan (self-destruct) xabar uchun (sekund)
    selfDestruct: { type: Number, default: 0 },
  },
  { timestamps: true }
);

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ text: 'text' });

const Message = mongoose.model('Message', messageSchema);
export default Message;
