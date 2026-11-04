import { Request, Response, NextFunction } from "express";
import { repoService } from "../services/repo.service.js";

export class RepoController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await repoService.createRepository(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      const result = await repoService.listRepositories(req.user!.id, { q, page, limit });
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await repoService.getRepositoryById(req.user!.id, req.params.repoId);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await repoService.updateRepository(req.user!.id, req.params.repoId, req.body);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await repoService.deleteRepository(req.user!.id, req.params.repoId);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const repoController = new RepoController();
