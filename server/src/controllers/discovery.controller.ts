import { Request, Response, NextFunction } from "express";
import { discoveryService } from "../services/discovery.service.js";

export class DiscoveryController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await discoveryService.searchPapers(req.body);
      res.status(200).json({
        success: true,
        data: result.papers || [],
        totalResults: result.total_results || 0,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const discoveryController = new DiscoveryController();
