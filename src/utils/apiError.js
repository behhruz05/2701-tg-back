// Oddiy xato klassi: status kod bilan birga tashlanadi.
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// async controllerlardagi xatoni avtomatik error middleware ga uzatadi.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
