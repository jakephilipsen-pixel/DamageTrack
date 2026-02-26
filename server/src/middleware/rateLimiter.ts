import rateLimit from 'express-rate-limit';

/**
 * Strict limiter for auth-adjacent endpoints (password reset, user creation).
 * 10 requests per 15 minutes per IP.
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

/**
 * Moderate limiter for file upload and import endpoints.
 * 30 requests per 15 minutes per IP.
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests, please try again later' },
});

/**
 * Token refresh limiter to prevent abuse.
 * 60 requests per 15 minutes per IP.
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts, please try again later' },
});
