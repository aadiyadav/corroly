import axios from "axios";
import { config } from "../config/index.js";

export const aiClient = axios.create({
  baseURL: config.aiService.url,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    "X-Internal-Service-Key": config.aiService.secret,
  },
});
