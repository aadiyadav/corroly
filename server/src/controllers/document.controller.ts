import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { documentService } from "../services/document.service.js";
import { aiClient } from "../lib/aiClient.js";

export class DocumentController {
  async importDiscovered(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await documentService.importDiscoveredDocument(
        req.user!.id,
        req.params.repoId,
        req.body
      );
      res.status(202).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }

  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: "NO_FILE", message: "No PDF file provided for upload." },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }
      const result = await documentService.uploadDocument(
        req.user!.id,
        req.params.repoId,
        req.file,
        req.body?.title
      );
      res.status(202).json({
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
      const result = await documentService.listDocuments(req.params.repoId);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await documentService.getDocumentById(req.params.repoId, req.params.docId);
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
      const result = await documentService.deleteDocument(
        req.user!.id,
        req.params.repoId,
        req.params.docId
      );
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }

  async streamProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { docId } = req.params;
    const jobId = req.query.jobId as string;

    if (!jobId) {
      res.status(400).json({
        success: false,
        error: { code: "MISSING_PARAM", message: "jobId query parameter is required." },
      });
      return;
    }

    try {
      // Connect to FastAPI SSE stream
      const aiResponse = await aiClient.get(`/internal/v1/ingest/jobs/${jobId}/stream`, {
        responseType: "stream",
      });

      // Configure SSE headers for client
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      // Keepalive heartbeat every 15 seconds to prevent intermediate proxy drops
      const keepAliveInterval = setInterval(() => {
        if (!res.writableEnded) {
          res.write(": keepalive\n\n");
        }
      }, 15000);

      const cleanupStream = () => {
        clearInterval(keepAliveInterval);
      };

      let pendingUpdate: Promise<unknown> | null = null;
      let buffer = "";

      aiResponse.data.on("data", async (chunk: Buffer) => {
        const text = chunk.toString();
        res.write(text);

        buffer += text;
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          const lines = block.split(/\r?\n/);
          let eventType = "";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.slice(5).trim();
            }
          }

          if (eventType === "done" && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              const stats = parsed.result || {};
              pendingUpdate = documentService.updateDocumentIngestionStatus(docId, {
                status: "INDEXED",
                cloudinaryUrl: stats.cloudinary_url,
                cloudinaryPublicId: stats.cloudinary_public_id,
                pageCount: stats.page_count,
                fileSizeBytesRaw: stats.file_size_bytes_raw,
                fileSizeBytesComp: stats.file_size_bytes_comp,
              });
              await pendingUpdate;
            } catch (parseErr) {
              console.error("[SSE Parse Error]", parseErr);
            }
          } else if (eventType === "error") {
            let errorMsg = "Ingestion failed during processing.";
            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) errorMsg = parsed.error;
              } catch {}
            }
            pendingUpdate = documentService.updateDocumentIngestionStatus(docId, {
              status: "FAILED",
              errorMessage: errorMsg,
            });
            await pendingUpdate;
          }
        }
      });

      aiResponse.data.on("end", async () => {
        cleanupStream();
        if (pendingUpdate) {
          try {
            await pendingUpdate;
          } catch {}
        }
        res.end();
      });

      aiResponse.data.on("error", (streamErr: unknown) => {
        cleanupStream();
        console.error("[StreamError]", streamErr);
        res.end();
      });

      req.on("close", () => {
        cleanupStream();
        if (aiResponse.data.destroy) {
          aiResponse.data.destroy();
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async streamFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { repoId, docId } = req.params;
    try {
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      const allowedOrigin = req.headers.origin || "http://localhost:3000";
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Range");
      res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
      res.setHeader("Accept-Ranges", "bytes");

      // 1. Try local cache in ai-service
      const response = await aiClient.get(`/internal/v1/ingest/documents/${docId}/file`, {
        responseType: "stream",
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      if (response.headers["content-length"]) {
        res.setHeader("Content-Length", String(response.headers["content-length"]));
      }
      response.data.pipe(res);
      return;
    } catch (err: any) {
      // 2. Fallback to Cloudinary URL if available
      try {
        const doc = await documentService.getDocumentById(repoId, docId);
        if (doc?.cloudinaryUrl && !doc.cloudinaryUrl.includes("mock-cloud")) {
          const cloudResp = await axios.get(doc.cloudinaryUrl, { responseType: "stream" });
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "inline");
          if (cloudResp.headers["content-length"]) {
            res.setHeader("Content-Length", String(cloudResp.headers["content-length"]));
          }
          cloudResp.data.pipe(res);
          return;
        }
      } catch (cloudErr) {
        console.error("[StreamFile Cloudinary Fallback Error]", cloudErr);
      }

      res.status(404).json({
        error: { code: "NOT_FOUND", message: "PDF binary is not available." },
      });
    }
  }
}

export const documentController = new DocumentController();
