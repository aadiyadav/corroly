import { z } from "zod";

export const createChatSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
  }),
  params: z.object({
    repoId: z.string().uuid("Invalid repository UUID format"),
  }),
});

export const sendChatMessageSchema = z.object({
  body: z.object({
    prompt: z.string().min(1, "Prompt cannot be empty").max(4000),
    documentIds: z.array(z.string().uuid()).optional(),
  }),
  params: z.object({
    repoId: z.string().uuid("Invalid repository UUID format"),
    chatId: z.string().uuid("Invalid conversation UUID format"),
  }),
});

export const updateChatSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
  }),
  params: z.object({
    repoId: z.string().uuid("Invalid repository UUID format"),
    chatId: z.string().uuid("Invalid conversation UUID format"),
  }),
});
