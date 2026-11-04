import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query && typeof req.query.token === "string") {
    token = req.query.token;
  } else if (req.cookies && typeof req.cookies.accessToken === "string") {
    token = req.cookies.accessToken;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication token missing or malformed.",
      },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
    };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Authentication token is invalid or expired.",
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }
}

export async function verifyRepositoryOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "User not authenticated." },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  const repoId = req.params.repoId;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!repoId || !uuidRegex.test(repoId)) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_PARAM", message: "Invalid repository UUID identifier." },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  try {
    const repository = await prisma.repository.findFirst({
      where: {
        id: repoId,
        userId: req.user.id,
      },
    });

    if (!repository) {
      // Return 404 to prevent IDOR existence disclosure across tenants
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Repository not found." },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
