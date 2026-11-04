import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { MessageRole, Prisma } from "@prisma/client";

export class ChatService {
  async listConversations(repoId: string) {
    const convos = await prisma.conversation.findMany({
      where: { repositoryId: repoId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return convos.map((c) => ({
      id: c.id,
      title: c.title,
      messageCount: c._count.messages,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async createConversation(repoId: string, title?: string) {
    return prisma.conversation.create({
      data: {
        repositoryId: repoId,
        title: title || "New Discussion",
      },
    });
  }
  async updateConversation(repoId: string, chatId: string, title: string) {
    const convo = await prisma.conversation.findFirst({
      where: { id: chatId, repositoryId: repoId },
    });
    if (!convo) {
      const err: AppError = new Error("Conversation not found.");
      err.statusCode = 404;
      err.code = "CHAT_NOT_FOUND";
      throw err;
    }
    return prisma.conversation.update({
      where: { id: chatId },
      data: { title },
    });
  }

  async deleteConversation(repoId: string, chatId: string) {
    const convo = await prisma.conversation.findFirst({
      where: { id: chatId, repositoryId: repoId },
    });
    if (!convo) {
      const err: AppError = new Error("Conversation not found.");
      err.statusCode = 404;
      err.code = "CHAT_NOT_FOUND";
      throw err;
    }
    await prisma.conversation.delete({
      where: { id: chatId },
    });
    return { success: true };
  }

  async getMessages(repoId: string, chatId: string) {
    const convo = await prisma.conversation.findFirst({
      where: { id: chatId, repositoryId: repoId },
    });

    if (!convo) {
      const err: AppError = new Error("Conversation not found.");
      err.statusCode = 404;
      err.code = "CHAT_NOT_FOUND";
      throw err;
    }

    return prisma.chatMessage.findMany({
      where: { conversationId: chatId },
      orderBy: { createdAt: "asc" },
    });
  }

  async saveMessage(
    chatId: string,
    role: MessageRole,
    content: string,
    citations?: unknown,
    tokenCount?: number
  ) {
    return prisma.$transaction(async (tx) => {
      const msg = await tx.chatMessage.create({
        data: {
          conversationId: chatId,
          role,
          content,
          citations: citations ? (citations as Prisma.InputJsonValue) : Prisma.JsonNull,
          tokenCount,
        },
      });

      // Touch conversation updatedAt within the same atomic transaction
      await tx.conversation.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      return msg;
    });
  }
}

export const chatService = new ChatService();
