import { Request, Response, NextFunction } from "express";
import { chatService } from "../services/chat.service.js";
import { aiClient } from "../lib/aiClient.js";

export class ChatController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await chatService.listConversations(req.params.repoId);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await chatService.createConversation(req.params.repoId, req.body?.title);
      res.status(201).json({
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
      const result = await chatService.updateConversation(
        req.params.repoId,
        req.params.chatId,
        req.body.title
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

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await chatService.deleteConversation(
        req.params.repoId,
        req.params.chatId
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

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await chatService.getMessages(req.params.repoId, req.params.chatId);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }

  async streamMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { repoId, chatId } = req.params;
    const { prompt, documentIds } = req.body;
    const userId = req.user!.id;

    try {
      // 1. Fetch message history
      const historyMessages = await chatService.getMessages(repoId, chatId);
      const history = historyMessages.map((m) => ({
        role: m.role.toLowerCase(),
        content: m.content,
      }));

      // 2. Persist user prompt
      await chatService.saveMessage(chatId, "USER", prompt);

      // 3. Connect to AI service RAG stream with optional documentIds filter
      const aiResponse = await aiClient.post(
        "/internal/v1/rag/stream",
        {
          userId,
          repoId,
          prompt,
          history,
          topK: Array.isArray(documentIds) && documentIds.length > 0 ? 16 : 12,
          documentIds: Array.isArray(documentIds) ? documentIds : undefined,
        },
        {
          responseType: "stream",
        }
      );

      // Configure SSE response headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      // Keepalive heartbeat every 15 seconds to prevent intermediate proxy/load balancer drops
      const keepAliveInterval = setInterval(() => {
        if (!res.writableEnded) {
          res.write(": keepalive\n\n");
        }
      }, 15000);

      let fullAssistantAnswer = "";
      let capturedCitations: unknown = null;
      let capturedTokenCount = 0;
      let buffer = "";

      const cleanupStream = () => {
        clearInterval(keepAliveInterval);
      };

      aiResponse.data.on("data", (chunk: Buffer) => {
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

          if (eventType === "token" && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.token) {
                fullAssistantAnswer += parsed.token;
                capturedTokenCount += 1;
              }
            } catch {
              // Ignore parse errors on intermediate chunks
            }
          } else if (eventType === "citations" && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              capturedCitations = parsed.citations;
            } catch {
              // Ignore
            }
          } else if (eventType === "done" && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.tokenCount) {
                capturedTokenCount = parsed.tokenCount;
              }
            } catch {
              // Ignore
            }
          }
        }
      });

      aiResponse.data.on("end", async () => {
        cleanupStream();
        try {
          // Persist assistant grounded answer and citations in database
          if (fullAssistantAnswer.trim()) {
            await chatService.saveMessage(
              chatId,
              "ASSISTANT",
              fullAssistantAnswer,
              capturedCitations,
              capturedTokenCount
            );
          }
        } catch (dbErr) {
          console.error("[DB Save Error] Failed to persist assistant answer:", dbErr);
        } finally {
          res.end();
        }
      });

      aiResponse.data.on("error", (streamErr: unknown) => {
        cleanupStream();
        console.error("[ChatStreamError]", streamErr);
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
}

export const chatController = new ChatController();
