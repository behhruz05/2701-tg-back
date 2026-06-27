# Telegram Web — Backend API (haqiqiy Telegram / MTProto)

Bu backend **haqiqiy Telegram** serverlariga ulanadi (GramJS / MTProto orqali).
O'z bazasi yo'q — barcha chat, xabar, kontakt to'g'ridan-to'g'ri Telegramdan keladi.

## 0. Tayyorgarlik

1. https://my.telegram.org → **API development tools** → app yarating.
2. `api_id` va `api_hash` ni `back/.env` ga yozing:
   ```
   TG_API_ID=123456
   TG_API_HASH=abcdef...
   ```
3. Ishga tushirish: `cd back && npm run dev` → `http://localhost:5987`

## 1. Login oqimi (3 qadam)

| Qadam | So'rov | Body | Javob |
|------|--------|------|-------|
| 1. Kod yuborish | `POST /api/tg/auth/send-code` | `{ phone }` | `{ loginId }` |
| 2. Kod bilan kirish | `POST /api/tg/auth/sign-in` | `{ loginId, code }` | `{ session, user }` yoki `{ needPassword: true }` |
| 3. 2FA (kerak bo'lsa) | `POST /api/tg/auth/sign-in` | `{ loginId, password }` | `{ session, user }` |

**`session`** — bu akkauntning kaliti. Frontend uni saqlaydi (localStorage) va
keyingi **har bir so'rovda** header bilan yuboradi:

```
x-tg-session: <session string>
```

## 2. Asosiy endpointlar (hammasi `x-tg-session` talab qiladi)

| Maqsad | Metod va manzil |
|--------|-----------------|
| Suhbatlar ro'yxati | `GET /api/tg/dialogs?limit=50` |
| Xabarlar | `GET /api/tg/messages/:chatId?limit=30&offsetId=0` |
| Matn yuborish | `POST /api/tg/messages/:chatId` `{ text, replyTo? }` |
| Media yuborish | `POST /api/tg/messages/:chatId/media` (multipart: `media`, `caption?`, `voice?`, `videoNote?`) |
| O'qildi | `POST /api/tg/messages/:chatId/read` |
| Tahrirlash | `PUT /api/tg/messages/:chatId/:messageId` `{ text }` |
| O'chirish | `DELETE /api/tg/messages/:chatId` `{ messageIds:[], revoke? }` |
| Forward | `POST /api/tg/messages/:chatId/forward` `{ toChatId, messageIds:[] }` |
| Reaksiya | `POST /api/tg/messages/:chatId/:messageId/react` `{ emoji }` |
| Pin | `POST /api/tg/messages/:chatId/:messageId/pin` `{ unpin? }` |
| Yozyapti... | `POST /api/tg/messages/:chatId/typing` |
| Suhbatda qidirish | `GET /api/tg/messages/:chatId/search?q=` |
| Global qidiruv | `GET /api/tg/search?q=` |
| Kontaktlar | `GET /api/tg/contacts` |
| Guruh a'zolari | `GET /api/tg/chats/:chatId/members` |
| Entity ma'lumoti | `GET /api/tg/entity/:chatId` |
| Media yuklab olish | `GET /api/tg/messages/:chatId/:messageId/file` |
| Profil (me) | `GET /api/tg/auth/me` |
| Chiqish | `POST /api/tg/auth/logout` |

`chatId` — raqamli id yoki `@username` bo'lishi mumkin.

## 3. Real-time (Socket.IO)

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:5987", {
  auth: { sessions: [session1, session2] } // bir nechta akkaunt!
});
socket.on("tg:ready", () => console.log("tayyor"));
socket.on("tg:message:new", (msg) => { /* yangi xabar keldi */ });
socket.emit("tg:add-session", newSession); // keyin akkaunt qo'shish
```

## 4. Multi-account (4-5 akkaunt) logikasi

- Har bir akkaunt = **bitta `session` string**. Boshqa hech narsa kerak emas.
- Frontend `sessions` massivini saqlaydi, masalan:
  ```json
  [
    { "label": "Asosiy", "session": "1Ab...", "user": {...} },
    { "label": "Ish",    "session": "1Cd...", "user": {...} }
  ]
  ```
- Akkaunt **almashtirish** = shunchaki boshqa `session` ni `x-tg-session` header'ida
  yuborish. Backend har bir sessiya uchun alohida Telegram klientini xotirada
  saqlaydi (sessiya hashi bo'yicha), shuning uchun ular bir-biriga xalaqit bermaydi.
- Real-time'da socketga `sessions: [...]` massivini bersangiz, hamma akkauntning
  yangi xabarlari bitta ulanishda keladi (`tg:message:new` ichida `chatId` bilan).
- Yangi akkaunt qo'shish = yana bir marta login oqimini o'tash → yangi `session`
  olib, massivga qo'shish.
