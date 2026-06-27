import mongoose from 'mongoose';

// Har bir a'zoning shu chatga oid shaxsiy holati (mute, archive, pin...).
const memberStateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Bildirishnomani o'chirish: null = mute emas, Date = shu vaqtgacha mute,
    // 0 (epoch) qiymatini "abadiy" sifatida ishlatamiz.
    mutedUntil: { type: Date, default: null },

    // Chatni arxivga tashlash
    archived: { type: Boolean, default: false },

    // Chatni ro'yxat tepasiga qadash (pin)
    pinned: { type: Boolean, default: false },

    // Foydalanuvchi tarixni shu vaqtdan oldin tozalagan bo'lsa
    clearedAt: { type: Date, default: null },

    // Chatni o'zi uchun o'chirib qo'ygan bo'lsa (ro'yxatdan yashiriladi)
    deleted: { type: Boolean, default: false },

    // Necha xabar o'qilmagan (tezkor hisob uchun, ixtiyoriy)
    unreadCount: { type: Number, default: 0 },
  },
  { _id: false }
);

// Chat — 1-1 suhbat, guruh yoki kanal bo'lishi mumkin.
const chatSchema = new mongoose.Schema(
  {
    // Chat turi: private (1-1), group (guruh), channel (kanal), saved (Saved Messages)
    type: {
      type: String,
      enum: ['private', 'group', 'channel', 'saved'],
      default: 'private',
    },

    // Eski kod bilan moslik uchun (type === 'group' || 'channel' bo'lsa true)
    isGroup: { type: Boolean, default: false },

    // Guruh/kanal uchun nom, rasm va tavsif (1-1 da bo'sh qoladi)
    name: { type: String, default: '', trim: true, maxlength: 128 },
    avatar: { type: String, default: '' },
    description: { type: String, default: '', maxlength: 500 },

    // Kanal/guruh uchun ommaviy username (@kanal) — invite link uchun ham
    username: { type: String, default: '', trim: true, lowercase: true },

    // Suhbatdoshlar
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Guruh adminlari va egasi (owner)
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Oxirgi xabar (chat ro'yxatida ko'rsatish uchun)
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },

    // Qadalgan (pin qilingan) xabarlar
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],

    // Taklif (invite) havolasi tokeni
    inviteToken: { type: String, default: '' },

    // Har bir a'zoning shaxsiy chat holati (mute/arxiv/pin/clear)
    memberStates: [memberStateSchema],

    // Guruhda jonli efir (live broadcast) ochiqmi va kim qatnashyapti
    liveActive: { type: Boolean, default: false },
    liveParticipants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

chatSchema.index({ members: 1 });
chatSchema.index({ username: 1 });

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
