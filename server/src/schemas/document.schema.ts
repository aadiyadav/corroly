import { z } from "zod";

export const importDiscoveredSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(500),
    authors: z.array(z.string()).default([]),
    abstract: z.string().optional(),
    source: z.enum(["ARXIV", "SEMANTIC_SCHOLAR", "PUBMED", "WIKIPEDIA", "MANUAL_UPLOAD"]),
    externalId: z.string().optional(),
    downloadUrl: z.string().url("Valid download URL is required"),
  }),
  params: z.object({
    repoId: z.string().uuid("Invalid repository UUID format"),
  }),
});

export const getDocumentProgressSchema = z.object({
  params: z.object({
    repoId: z.string().uuid("Invalid repository UUID format"),
    docId: z.string().uuid("Invalid document UUID format"),
  }),
  query: z.object({
    jobId: z.string().min(1, "Job ID is required"),
    token: z.string().optional(),
  }),
});

export const deleteDocumentSchema = z.object({
  params: z.object({
    repoId: z.string().uuid("Invalid repository UUID format"),
    docId: z.string().uuid("Invalid document UUID format"),
  }),
});
