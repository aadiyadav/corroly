import { URL } from "url";
import { AppError } from "./errorHandler.js";

const ALLOWED_HTTPS_DOMAINS = [
  "arxiv.org",
  "export.arxiv.org",
  "semanticscholar.org",
  "api.semanticscholar.org",
  "nih.gov",
  "ncbi.nlm.nih.gov",
  "pmc.ncbi.nlm.nih.gov",
  "wikipedia.org",
  "wikimedia.org",
  "upload.wikimedia.org",
  "cloudinary.com",
  "res.cloudinary.com",
];

const PRIVATE_IP_PATTERNS = [
  /^127\./, // 127.0.0.0/8 (Loopback)
  /^10\./, // 10.0.0.0/8 (Private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (Private)
  /^192\.168\./, // 192.168.0.0/16 (Private)
  /^169\.254\./, // 169.254.0.0/16 (Link-local / cloud metadata)
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 Unique Local
  /^fe80:/i, // IPv6 Link-Local
  /^0\./, // 0.0.0.0/8
];

/**
 * Validates external download URLs against an HTTPS domain whitelist
 * and protects against SSRF attempts by forbidding private IP ranges and localhost.
 */
export function validateSafeDownloadUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    const err: AppError = new Error("Invalid document download URL format.");
    err.statusCode = 400;
    err.code = "INVALID_URL";
    throw err;
  }

  // Must be strictly HTTPS
  if (parsed.protocol !== "https:") {
    const err: AppError = new Error("Only secure HTTPS download URLs are permitted.");
    err.statusCode = 400;
    err.code = "SSRF_ATTEMPT_BLOCKED";
    throw err;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block private and link-local IP addresses (e.g. cloud metadata 169.254.169.254)
  if (
    hostname === "localhost" ||
    PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname))
  ) {
    const err: AppError = new Error("Access to local or private network addresses is forbidden.");
    err.statusCode = 403;
    err.code = "SSRF_ATTEMPT_BLOCKED";
    throw err;
  }

  // Verify hostname is or ends with an allowed domain
  const isAllowed = ALLOWED_HTTPS_DOMAINS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );

  if (!isAllowed) {
    const err: AppError = new Error(
      `Download URL host '${hostname}' is not in the approved academic literature domain whitelist.`
    );
    err.statusCode = 403;
    err.code = "SSRF_ATTEMPT_BLOCKED";
    throw err;
  }

  return rawUrl;
}

