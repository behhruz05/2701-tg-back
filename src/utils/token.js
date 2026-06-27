import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Foydalanuvchi id sidan JWT token yasaymiz.
export function signToken(userId) {
  return jwt.sign({ id: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

// Tokenni tekshirib, ichidagi ma'lumotni qaytaramiz.
export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
