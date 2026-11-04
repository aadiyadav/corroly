import { prisma } from "../lib/prisma.js";
import { aiClient } from "../lib/aiClient.js";
import { AppError } from "../middleware/errorHandler.js";

export class RepoService {
  async createRepository(userId: string, data: { name: string; description?: string; colorTag?: string }) {
    return prisma.repository.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        colorTag: data.colorTag || "#7f1e23",
      },
    });
  }

  async listRepositories(userId: string, options?: { q?: string; page?: number; limit?: number }) {
    const q = options?.q?.trim();
    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit = options?.limit && options.limit > 0 ? options.limit : undefined;

    const where: any = {
      userId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const total = await prisma.repository.count({ where });

    const repos = await prisma.repository.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(limit ? { skip: (page - 1) * limit, take: limit } : {}),
      include: {
        _count: {
          select: {
            documents: true,
            conversations: true,
          },
        },
      },
    });

    const items = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      description: repo.description,
      colorTag: repo.colorTag,
      documentCount: repo._count.documents,
      conversationCount: repo._count.conversations,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    }));

    const totalPages = limit ? Math.max(1, Math.ceil(total / limit)) : 1;

    return {
      items,
      pagination: {
        total,
        page,
        limit: limit || total,
        totalPages,
      },
    };
  }

  async getRepositoryById(userId: string, repoId: string) {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, userId },
      include: {
        _count: {
          select: {
            documents: true,
            conversations: true,
          },
        },
      },
    });

    if (!repo) {
      const err: AppError = new Error("Repository not found.");
      err.statusCode = 404;
      err.code = "REPO_NOT_FOUND";
      throw err;
    }

    return {
      id: repo.id,
      name: repo.name,
      description: repo.description,
      colorTag: repo.colorTag,
      documentCount: repo._count.documents,
      conversationCount: repo._count.conversations,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    };
  }

  async updateRepository(
    userId: string,
    repoId: string,
    data: { name?: string; description?: string; colorTag?: string }
  ) {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, userId },
    });

    if (!repo) {
      const err: AppError = new Error("Repository not found.");
      err.statusCode = 404;
      err.code = "REPO_NOT_FOUND";
      throw err;
    }

    return prisma.repository.update({
      where: { id: repoId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.colorTag ? { colorTag: data.colorTag } : {}),
      },
    });
  }

  async deleteRepository(userId: string, repoId: string) {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, userId },
      include: {
        documents: {
          select: { cloudinaryPublicId: true },
        },
      },
    });

    if (!repo) {
      const err: AppError = new Error("Repository not found.");
      err.statusCode = 404;
      err.code = "REPO_NOT_FOUND";
      throw err;
    }

    const publicIds = repo.documents
      .map((d) => d.cloudinaryPublicId)
      .filter((id): id is string => Boolean(id));

    // Clean up ChromaDB and Cloudinary in background
    try {
      await aiClient.post("/internal/v1/cleanup/repository", {
        userId,
        repoId,
        publicIds,
      });
    } catch (cleanupError) {
      console.error("[CleanupError] Failed to purge vector/storage assets for repo:", repoId, cleanupError);
    }

    // Cascade delete in PostgreSQL
    await prisma.repository.delete({
      where: { id: repoId },
    });

    return { message: "Repository and associated assets successfully deleted." };
  }
}

export const repoService = new RepoService();
