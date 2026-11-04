import { z } from "zod";

export const searchDiscoverySchema = z.object({
  body: z.object({
    query: z.string().min(1, "Query string is required").max(500),
    sources: z
      .array(z.enum(["ARXIV", "PUBMED", "WIKIPEDIA"]))
      .optional(),
    limit: z.number().int().min(1).max(50).optional(),
    page: z.number().int().min(1).optional(),
  }),
  params: z.object({
    repoId: z.string().uuid("Invalid repository UUID format"),
  }),
});
