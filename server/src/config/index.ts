import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "development-jwt-access-secret-minimum-32-chars-long",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "development-jwt-refresh-secret-minimum-32-chars-long",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "7d",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    refreshMaxAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  },

  aiService: {
    url: process.env.AI_SERVICE_URL || "http://127.0.0.1:8000",
    secret: process.env.GENAI_INTERNAL_SECRET || "shared-secret-key-between-server-and-fastapi",
  },
};
