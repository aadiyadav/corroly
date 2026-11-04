import { z } from "zod";

export const createRepoSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Repository name is required").max(120),
    description: z.string().max(1000).optional(),
    colorTag: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid 6-character hex color code").optional(),
  }),
});

export const updateRepoSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(1000).optional(),
    colorTag: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid 6-character hex color code").optional(),
  }),
  params: z.object({
    repoId: z.string().uuid("Invalid repository UUID format"),
  }),
});

export const listRepoSchema = z.object({
  query: z
    .object({
      q: z.string().max(200).optional(),
      page: z.string().regex(/^\d+$/).transform(Number).optional(),
      limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    })
    .optional(),
});
