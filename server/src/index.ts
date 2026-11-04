import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || "http://localhost:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

// Security & Request Parsing Middleware
app.use(
  helmet({
    frameguard: false,
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "frame-ancestors": [
          "'self'",
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : []),
        ],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

import { apiLimiter } from "./middleware/rateLimiter.js";
import apiV1Router from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Rate limiting on API routes
app.use("/api/v1", apiLimiter);

// Health Check Endpoint
app.get("/health", (req: Request, res: Response) => {
  return res.status(200).json({
    status: "healthy",
    service: "research-buddy-server",
    timestamp: new Date().toISOString(),
  });
});

// Root API Welcome Endpoint
app.get("/api/v1", (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "Corroly Backend Server API v1",
  });
});

// Mount Master API v1 Router
app.use("/api/v1", apiV1Router);

// Global 404 Route Handler
app.use((req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

// Global Error Handler
app.use(errorHandler);


// Start Server when run directly
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[Corroly Server] Running on http://localhost:${PORT}`);
  });
}

export default app;
