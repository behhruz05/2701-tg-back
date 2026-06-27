import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      lowercase: true,
    },
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, default: '', trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: { type: String, default: '', trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 200 },

    // Online / Offline holati
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    // Kontaktlar (do'stlar ro'yxati) — ixtiyoriy nom bilan
    contacts: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        nickname: { type: String, default: '' },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // Bloklangan foydalanuvchilar
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Maxfiylik sozlamalari: kim ko'ra oladi
    privacy: {
      lastSeen: {
        type: String,
        enum: ['everybody', 'contacts', 'nobody'],
        default: 'everybody',
      },
      profilePhoto: {
        type: String,
        enum: ['everybody', 'contacts', 'nobody'],
        default: 'everybody',
      },
      phone: {
        type: String,
        enum: ['everybody', 'contacts', 'nobody'],
        default: 'contacts',
      },
    },

    // Bildirishnoma / ilova sozlamalari
    settings: {
      notifications: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      theme: { type: String, default: 'light' },
    },

    // 2 bosqichli tasdiqlash (ixtiyoriy)
    twoFactorEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Qidiruv tez bo'lishi uchun text index (username, ism, familiya bo'yicha)
userSchema.index({ username: 'text', firstName: 'text', lastName: 'text' });

// Parolni saqlashdan oldin hash qilamiz.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Kiritilgan parolni hashlangan parol bilan solishtiramiz.
userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
