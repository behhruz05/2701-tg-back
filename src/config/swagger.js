// Swagger (OpenAPI) hujjati. /api/docs da ochiladi.
export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Telegram Web API (haqiqiy Telegram / MTProto)',
    version: '1.0.0',
    description:
      'GramJS orqali haqiqiy Telegramga ulanadigan backend. ' +
      'Login qilgach olingan `session` stringini "Authorize" tugmasi orqali kiriting.',
  },
  servers: [{ url: 'http://localhost:5987', description: 'Local' }],
  components: {
    securitySchemes: {
      // session string'ni x-tg-session header'da yuboramiz
      tgSession: { type: 'apiKey', in: 'header', name: 'x-tg-session' },
    },
  },
  security: [{ tgSession: [] }],
  tags: [
    { name: 'Auth', description: 'Login / sessiya' },
    { name: 'Dialogs', description: 'Suhbatlar ro\'yxati' },
    { name: 'Messages', description: 'Xabarlar' },
    { name: 'Contacts & Search', description: 'Kontakt va qidiruv' },
  ],
  paths: {
    '/api/health': {
      get: { tags: ['Auth'], summary: 'Server holati', security: [], responses: { 200: { description: 'OK' } } },
    },
    '/api/tg/auth/send-code': {
      post: {
        tags: ['Auth'], summary: '1-qadam: telefon raqamga kod yuborish', security: [],
        requestBody: { required: true, content: { 'application/json': {
          schema: { type: 'object', required: ['phone'], properties: {
            phone: { type: 'string', example: '+998901234567' },
            apiId: { type: 'integer', description: '.env da bo\'lmasa' },
            apiHash: { type: 'string' },
          } } } } },
        responses: { 200: { description: '{ loginId }' } },
      },
    },
    '/api/tg/auth/sign-in': {
      post: {
        tags: ['Auth'], summary: '2-qadam: kod (va kerak bo\'lsa 2FA parol) bilan kirish', security: [],
        requestBody: { required: true, content: { 'application/json': {
          schema: { type: 'object', required: ['loginId'], properties: {
            loginId: { type: 'string' },
            code: { type: 'string', example: '12345' },
            password: { type: 'string', description: '2FA yoqilgan bo\'lsa' },
          } } } } },
        responses: { 200: { description: '{ session, user } yoki { needPassword: true }' } },
      },
    },
    '/api/tg/auth/me': {
      get: { tags: ['Auth'], summary: 'Joriy foydalanuvchi', responses: { 200: { description: 'OK' } } },
    },
    '/api/tg/auth/logout': {
      post: { tags: ['Auth'], summary: 'Chiqish', responses: { 200: { description: 'OK' } } },
    },
    '/api/tg/dialogs': {
      get: {
        tags: ['Dialogs'], summary: 'Suhbatlar ro\'yxati',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }],
        responses: { 200: { description: '{ dialogs: [] }' } },
      },
    },
    '/api/tg/messages/{chatId}': {
      get: {
        tags: ['Messages'], summary: 'Xabarlar (sahifalab)',
        parameters: [
          { name: 'chatId', in: 'path', required: true, schema: { type: 'string' }, description: 'id yoki @username' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 30 } },
          { name: 'offsetId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: '{ messages: [] }' } },
      },
      post: {
        tags: ['Messages'], summary: 'Matn yuborish',
        parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          text: { type: 'string' }, replyTo: { type: 'integer' } } } } } },
        responses: { 201: { description: '{ message }' } },
      },
      delete: {
        tags: ['Messages'], summary: 'Xabar(lar)ni o\'chirish',
        parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          messageIds: { type: 'array', items: { type: 'integer' } }, revoke: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/tg/messages/{chatId}/media': {
      post: {
        tags: ['Messages'], summary: 'Media (rasm/ovoz/video/fayl) yuborish',
        parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: {
          media: { type: 'string', format: 'binary' },
          caption: { type: 'string' },
          voice: { type: 'boolean' },
          videoNote: { type: 'boolean' },
        } } } } },
        responses: { 201: { description: '{ message }' } },
      },
    },
    '/api/tg/messages/{chatId}/read': {
      post: { tags: ['Messages'], summary: 'O\'qildi deb belgilash',
        parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } } },
    },
    '/api/tg/messages/{chatId}/typing': {
      post: { tags: ['Messages'], summary: '"Yozyapti..." holati',
        parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } } },
    },
    '/api/tg/messages/{chatId}/forward': {
      post: { tags: ['Messages'], summary: 'Forward',
        parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          toChatId: { type: 'string' }, messageIds: { type: 'array', items: { type: 'integer' } } } } } } },
        responses: { 200: { description: 'OK' } } },
    },
    '/api/tg/messages/{chatId}/{messageId}': {
      put: { tags: ['Messages'], summary: 'Tahrirlash',
        parameters: [
          { name: 'chatId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'messageId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          text: { type: 'string' } } } } } },
        responses: { 200: { description: 'OK' } } },
    },
    '/api/tg/messages/{chatId}/{messageId}/react': {
      post: { tags: ['Messages'], summary: 'Reaksiya (emoji)',
        parameters: [
          { name: 'chatId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'messageId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          emoji: { type: 'string', example: '👍' } } } } } },
        responses: { 200: { description: 'OK' } } },
    },
    '/api/tg/messages/{chatId}/{messageId}/pin': {
      post: { tags: ['Messages'], summary: 'Pin / unpin',
        parameters: [
          { name: 'chatId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'messageId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          unpin: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'OK' } } },
    },
    '/api/tg/messages/{chatId}/{messageId}/file': {
      get: { tags: ['Messages'], summary: 'Media faylni yuklab olish',
        parameters: [
          { name: 'chatId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'messageId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Fayl (binary)' } } },
    },
    '/api/tg/messages/{chatId}/search': {
      get: { tags: ['Messages'], summary: 'Suhbat ichida qidirish',
        parameters: [
          { name: 'chatId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } } },
    },
    '/api/tg/search': {
      get: { tags: ['Contacts & Search'], summary: 'Global qidiruv',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '{ users, chats }' } } },
    },
    '/api/tg/contacts': {
      get: { tags: ['Contacts & Search'], summary: 'Kontaktlar', responses: { 200: { description: 'OK' } } },
    },
    '/api/tg/chats/{chatId}/members': {
      get: { tags: ['Contacts & Search'], summary: 'Guruh/kanal a\'zolari',
        parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } } },
    },
    '/api/tg/entity/{chatId}': {
      get: { tags: ['Contacts & Search'], summary: 'User/chat ma\'lumoti',
        parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } } },
    },
  },
};
