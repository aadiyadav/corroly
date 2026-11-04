import rateLimit from "express-rate-limit";
import { Request } from "express";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please try again after 15 minutes.",
    },
    meta: { timestamp: new Date().toISOString() },
  },
});

export const discoveryRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per user/IP
  keyGenerator: (req: Request) => req.user?.id || req.ip || "anonymous",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Literature discovery rate limit exceeded. Please wait a minute before searching again.",
    },
    meta: { timestamp: new Date().toISOString() },
  },
});

export const chatStreamRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 streaming requests per minute per user/IP
  keyGenerator: (req: Request) => req.user?.id || req.ip || "anonymous",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Chat generation rate limit exceeded. Please wait a minute before initiating more syntheses.",
    },
    meta: { timestamp: new Date().toISOString() },
  },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "API rate limit exceeded. Please throttle your requests.",
    },
    meta: { timestamp: new Date().toISOString() },
  },
});
