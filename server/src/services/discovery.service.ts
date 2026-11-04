import { aiClient } from "../lib/aiClient.js";

export class DiscoveryService {
  async searchPapers(data: { query: string; sources?: string[]; limit?: number; page?: number }) {
    const response = await aiClient.post("/internal/v1/discovery/search", data);
    return response.data;
  }
}

export const discoveryService = new DiscoveryService();
