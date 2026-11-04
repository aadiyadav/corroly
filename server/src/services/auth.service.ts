import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";
import { AppError } from "../middleware/errorHandler.js";

interface RotationGraceEntry {
  user: { id: string; email: string; name: string; createdAt: Date };
  accessToken: string;
  refreshToken: string;
  rotatedAt: number;
}

export interface RefreshResult {
  user: { id: string; email: string; name: string; createdAt: Date };
  accessToken: string;
  refreshToken: string;
}

// In-memory grace cache to absorb race conditions & concurrent requests within 60 seconds
const rotationGraceCache = new Map<string, RotationGraceEntry>();
const inflightRefreshes = new Map<string, Promise<RefreshResult>>();

function cleanExpiredGraceEntries() {
  const now = Date.now();
  for (const [hash, entry] of rotationGraceCache.entries()) {
    if (now - entry.rotatedAt > 60000) {
      rotationGraceCache.delete(hash);
    }
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateTokens(user: { id: string; email: string; name: string }) {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    config.jwt.accessSecret,
    { expiresIn: (config.jwt.accessExpiresIn || "7d") as jwt.SignOptions["expiresIn"] }
  );

  const rawRefreshToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + config.jwt.refreshMaxAgeMs);

  return { accessToken, rawRefreshToken, tokenHash, expiresAt };
}

export class AuthService {
  async register(data: { email: string; password: string; name: string }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      const err: AppError = new Error("An account with this email address already exists. Please sign in instead.");
      err.statusCode = 409;
      err.code = "USER_ALREADY_EXISTS";
      throw err;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
      },
    });

    const tokens = generateTokens(user);

    await prisma.refreshToken.create({
      data: {
        tokenHash: tokens.tokenHash,
        userId: user.id,
        expiresAt: tokens.expiresAt,
      },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      accessToken: tokens.accessToken,
      refreshToken: tokens.rawRefreshToken,
    };
  }

  async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      const err: AppError = new Error("No account found with this email address. Please check your email or create an account.");
      err.statusCode = 404;
      err.code = "USER_NOT_FOUND";
      throw err;
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      const err: AppError = new Error("Incorrect password. Please verify your password and try again.");
      err.statusCode = 401;
      err.code = "INCORRECT_PASSWORD";
      throw err;
    }

    const tokens = generateTokens(user);

    await prisma.refreshToken.create({
      data: {
        tokenHash: tokens.tokenHash,
        userId: user.id,
        expiresAt: tokens.expiresAt,
      },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      accessToken: tokens.accessToken,
      refreshToken: tokens.rawRefreshToken,
    };
  }

  async refresh(rawToken: string): Promise<RefreshResult> {
    if (!rawToken) {
      const err: AppError = new Error("Refresh token missing.");
      err.statusCode = 401;
      err.code = "REFRESH_TOKEN_MISSING";
      throw err;
    }

    const tokenHash = hashToken(rawToken);

    // 1. Check in-memory grace cache for recent rotation within 60s
    cleanExpiredGraceEntries();
    const cached = rotationGraceCache.get(tokenHash);
    if (cached && Date.now() - cached.rotatedAt < 60000) {
      return {
        user: cached.user,
        accessToken: cached.accessToken,
        refreshToken: cached.refreshToken,
      };
    }

    // 2. If a rotation for this token is currently inflight, deduplicate concurrent requests
    const inflight = inflightRefreshes.get(tokenHash);
    if (inflight) {
      return await inflight;
    }

    const refreshPromise = (async (): Promise<RefreshResult> => {
      const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!storedToken) {
        const err: AppError = new Error("Invalid refresh token.");
        err.statusCode = 401;
        err.code = "INVALID_REFRESH_TOKEN";
        throw err;
      }

      // If token was revoked, double check grace cache in case another request rotated it
      if (storedToken.isRevoked) {
        const recheckCached = rotationGraceCache.get(tokenHash);
        if (recheckCached && Date.now() - recheckCached.rotatedAt < 60000) {
          return {
            user: recheckCached.user,
            accessToken: recheckCached.accessToken,
            refreshToken: recheckCached.refreshToken,
          };
        }
        console.warn(`[Security Alert] Revoked refresh token presented for user ${storedToken.userId}. Invalidating all user sessions.`);
        // Breach detection: Revoke all refresh tokens for this compromised account
        await prisma.refreshToken.updateMany({
          where: { userId: storedToken.userId },
          data: { isRevoked: true },
        });
        const err: AppError = new Error("Compromised or revoked refresh token detected. All active sessions have been terminated. Please log in again.");
        err.statusCode = 401;
        err.code = "TOKEN_REVOKED";
        throw err;
      }

      if (new Date() > storedToken.expiresAt) {
        const err: AppError = new Error("Refresh token expired.");
        err.statusCode = 401;
        err.code = "EXPIRED_REFRESH_TOKEN";
        throw err;
      }

      const user = storedToken.user;
      const tokens = generateTokens(user);

      // Atomically revoke old token and insert new rotated token
      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { id: storedToken.id },
          data: { isRevoked: true },
        }),
        prisma.refreshToken.create({
          data: {
            tokenHash: tokens.tokenHash,
            userId: user.id,
            expiresAt: tokens.expiresAt,
          },
        }),
      ]);

      const result: RefreshResult = {
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
        accessToken: tokens.accessToken,
        refreshToken: tokens.rawRefreshToken,
      };

      // Cache rotation result for 60 seconds to absorb concurrent requests safely
      rotationGraceCache.set(tokenHash, {
        ...result,
        rotatedAt: Date.now(),
      });

      return result;
    })();

    inflightRefreshes.set(tokenHash, refreshPromise);
    try {
      return await refreshPromise;
    } finally {
      inflightRefreshes.delete(tokenHash);
    }
  }

  async logout(rawToken?: string) {
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      rotationGraceCache.delete(tokenHash);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    }
    return { success: true };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      const err: AppError = new Error("User not found.");
      err.statusCode = 404;
      err.code = "USER_NOT_FOUND";
      throw err;
    }

    return user;
  }
}

export const authService = new AuthService();
