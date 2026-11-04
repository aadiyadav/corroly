import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { aiClient } from "../lib/aiClient.js";
import { AppError } from "../middleware/errorHandler.js";
import { DocumentSource } from "@prisma/client";
import { validateSafeDownloadUrl } from "../middleware/ssrfGuard.js";

export class DocumentService {
  async importDiscoveredDocument(
    userId: string,
    repoId: string,
    data: {
      title: string;
      authors: string[];
      abstract?: string;
      source: DocumentSource;
      externalId?: string;
      downloadUrl: string;
    }
  ) {
    // Validate download URL against HTTPS whitelist and SSRF guard
    validateSafeDownloadUrl(data.downloadUrl);

    const jobId = crypto.randomUUID();

    // 1. Create document record with PENDING status in DB
    const doc = await prisma.document.create({
      data: {
        repositoryId: repoId,
        title: data.title,
        authors: data.authors,
        abstract: data.abstract,
        source: data.source,
        externalId: data.externalId,
        status: "PENDING",
      },
    });

    // 2. Dispatch async job to FastAPI microservice
    try {
      await aiClient.post("/internal/v1/ingest/process", {
        jobId,
        userId,
        repoId,
        docId: doc.id,
        title: data.title,
        downloadUrl: data.downloadUrl,
        authors: data.authors,
      });
    } catch (error) {
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: "FAILED",
          errorMessage: "Failed to queue ingestion job with AI service.",
        },
      });
      throw error;
    }

    return {
      document: doc,
      jobId,
    };
  }

  async uploadDocument(
    userId: string,
    repoId: string,
    file: { buffer: Buffer; originalname: string; mimetype?: string },
    title?: string
  ) {
    const jobId = crypto.randomUUID();
    const docTitle = title || file.originalname.replace(/\.pdf$/i, "");

    // 1. Create document record with PENDING status in DB
    const doc = await prisma.document.create({
      data: {
        repositoryId: repoId,
        title: docTitle,
        authors: ["Uploaded Document"],
        source: "MANUAL_UPLOAD",
        status: "PENDING",
      },
    });

    // 2. Dispatch multipart upload to FastAPI microservice
    try {
      const formData = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype || "application/pdf" });
      formData.append("file", blob, file.originalname);
      formData.append("jobId", jobId);
      formData.append("userId", userId);
      formData.append("repoId", repoId);
      formData.append("docId", doc.id);
      formData.append("title", docTitle);

      await aiClient.post("/internal/v1/ingest/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    } catch (error) {
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: "FAILED",
          errorMessage: "Failed to queue file upload with AI service.",
        },
      });
      throw error;
    }

    return {
      document: doc,
      jobId,
    };
  }

  async listDocuments(repoId: string) {
    return prisma.document.findMany({
      where: { repositoryId: repoId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getDocumentById(repoId: string, docId: string) {
    const doc = await prisma.document.findFirst({
      where: { id: docId, repositoryId: repoId },
    });

    if (!doc) {
      const err: AppError = new Error("Document not found.");
      err.statusCode = 404;
      err.code = "DOC_NOT_FOUND";
      throw err;
    }

    return doc;
  }

  async updateDocumentIngestionStatus(
    docId: string,
    data: {
      status: "INDEXED" | "FAILED" | "PROCESSING";
      cloudinaryUrl?: string;
      cloudinaryPublicId?: string;
      pageCount?: number;
      fileSizeBytesRaw?: number;
      fileSizeBytesComp?: number;
      errorMessage?: string;
    }
  ) {
    return prisma.document.update({
      where: { id: docId },
      data,
    });
  }

  async deleteDocument(userId: string, repoId: string, docId: string) {
    const doc = await prisma.document.findFirst({
      where: { id: docId, repositoryId: repoId },
    });

    if (!doc) {
      const err: AppError = new Error("Document not found.");
      err.statusCode = 404;
      err.code = "DOC_NOT_FOUND";
      throw err;
    }

    // Purge vectors and Cloudinary blobs via AI service
    try {
      await aiClient.post("/internal/v1/cleanup/document", {
        userId,
        repoId,
        docId,
        cloudinaryPublicId: doc.cloudinaryPublicId,
      });
    } catch (cleanupError) {
      console.error("[CleanupError] Failed to purge AI service assets for doc:", docId, cleanupError);
    }

    await prisma.document.delete({
      where: { id: docId },
    });

    return { message: "Document, vector embeddings, and storage assets successfully removed." };
  }
}

export const documentService = new DocumentService();
