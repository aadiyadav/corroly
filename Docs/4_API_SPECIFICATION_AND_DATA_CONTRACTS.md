# Research Paper Synthesizer (ResearchBuddy)
## API Specification, Data Contracts & Security Architecture

*Document Identifier:* `API-SPEC-004`  
*Version:* `1.0.0`  
*Status:* Approved for Implementation  
*Target Runtimes:* Node.js 20+ (Express Gateway), Python 3.10+ (FastAPI GenAI Service)  
*Protocols:* HTTPS REST, Server-Sent Events (SSE) over HTTP Chunked-Transfer Encoding  
*Security Compliance:* OWASP Top 10 API Security (2023), Zero-Trust Tenancy, SSRF Whitelisting, RTR Theft Detection  

---

## Table of Contents
1. [Global API Conventions & Protocols](#1-global-api-conventions--protocols)
2. [Production Security & Vulnerability Defense Framework](#2-production-security--vulnerability-defense-framework)
3. [Authentication & Session API (`/api/v1/auth`)](#3-authentication--session-api-apiv1auth)
4. [Workspace Repositories API (`/api/v1/repos`)](#4-workspace-repositories-api-apiv1repos)
5. [Multi-Source Literature Discovery API (`/api/v1/repos/:repoId/discovery`)](#5-multi-source-literature-discovery-api-apiv1reposrepoiddiscovery)
6. [Document Ingestion & Management API (`/api/v1/repos/:repoId/documents`)](#6-document-ingestion--management-api-apiv1reposrepoiddocuments)
7. [Conversational RAG & Streaming API (`/api/v1/repos/:repoId/chats`)](#7-conversational-rag--streaming-api-apiv1reposrepoidchats)
8. [Internal Microservice API: Gateway to FastAPI (`/internal/v1`)](#8-internal-microservice-api-gateway-to-fastapi-internalv1)
9. [Error Catalog & Rate Limiting Thresholds](#9-error-catalog--rate-limiting-thresholds)

---

## 1. Global API Conventions & Protocols

### 1.1 Base URLs & Versioning
* **Public Client API (API Gateway):** `https://api.researchbuddy.io/api/v1` (Dev: `http://localhost:5000/api/v1`)
* **Internal GenAI Microservice (Private Network Only):** `http://ai-service:8000/internal/v1` (Dev: `http://localhost:8000/internal/v1`)

### 1.2 Content Negotiation & Media Types
* Standard Endpoints: `Content-Type: application/json; charset=utf-8`
* Real-Time Streaming Endpoints: `Content-Type: text/event-stream; charset=utf-8` with `Cache-Control: no-cache` and `Connection: keep-alive`

### 1.3 Standard Response Envelopes
To ensure predictable client-side consumption, all JSON endpoints return uniform envelopes:

#### Success Envelope (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-10-12T19:00:00.000Z",
    "requestId": "req_8b5a32b9_01"
  }
}
```

#### Paginated Success Envelope (`200 OK`)
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalRecords": 85,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "meta": {
    "timestamp": "2026-10-12T19:00:00.000Z",
    "requestId": "req_8b5a32b9_02"
  }
}
```

#### Error Envelope (`4xx Client Error`, `5xx Server Error`)
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested repository does not exist or you do not have permission to view it.",
    "details": []
  },
  "meta": {
    "timestamp": "2026-10-12T19:00:00.000Z",
    "requestId": "req_8b5a32b9_03"
  }
}
```

---

## 2. Production Security & Vulnerability Defense Framework

To protect ResearchBuddy in live production, the API enforces defenses against every critical threat vector identified in the OWASP Top 10 API Security standard:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION API DEFENSE-IN-DEPTH MATRIX                          │
├────────────────────────────┬─────────────────────────────┬─────────────────────────────┤
│ THREAT VECTOR              │ POTENTIAL VULNERABILITY     │ APPLIED PRODUCTION DEFENSE  │
├────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ 1. Broken Object Level     │ Attacker reads/modifies     │ Mandatory PostgreSQL owner- │
│    Authorization (BOLA)    │ other users' repos/docs via │ ship guard before every     │
│                            │ guessed UUID parameter      │ repo/doc operation.         │
├────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ 2. Server-Side Request     │ Malicious PDF download URL  │ Strict domain whitelisting  │
│    Forgery (SSRF)          │ hits cloud metadata IP      │ (arXiv, S2, PubMed) + local │
│                            │ (169.254.169.254) or DB     │ IP range blocking.          │
├────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ 3. Decompression Bombs /   │ Recursive PDF streams hang  │ 50MB file size cap, 100-    │
│    Memory Exhaustion       │ pikepdf / PyMuPDF workers   │ page max cap, CPU execution │
│                            │ and crash microservice      │ timeouts (30s max).         │
├────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ 4. Refresh Token Theft &   │ Stolen cookie used after    │ Refresh Token Rotation      │
│    Replay Attacks          │ legitimate user logs out    │ (RTR): Token reuse nukes    │
│                            │                             │ all active user sessions.   │
├────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ 5. Prompt Injection &      │ User prompt attempts to     │ Strict structural boundary  │
│    RAG Context Leakage     │ extract system instructions │ prompts; LLM output bounded │
│                            │ or bypass paper context     │ to bracketed sources only.  │
├────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ 6. Credential Stuffing &   │ Automated bot attacks on    │ Strict sliding-window rate  │
│    Brute-Force DoS         │ /auth/login and /auth/reg   │ limiter (5 req/15 min on    │
│                            │                             │ auth, 100 req/min general). │
└────────────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

### 2.1 SSRF Prevention Whitelist Specification
When initiating paper ingestion via URL, the API Gateway and FastAPI service validate target download URLs against strict criteria:
1. **Allowed Protocols:** `https:` only. `http:`, `file:`, `ftp:`, `gopher:` are instantly rejected.
2. **Domain Whitelist:** Must match permitted host suffixes:
   * `*.arxiv.org` (e.g. `arxiv.org`, `export.arxiv.org`)
   * `*.semanticscholar.org`
   * `*.ncbi.nlm.nih.gov`
   * `*.nih.gov`
   * `*.wikipedia.org`
   * `res.cloudinary.com`
3. **Private IP Rejection:** URLs resolving to `127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254` (AWS/GCP metadata), or `::1` are blocked before DNS resolution or HTTP execution.

### 2.2 Broken Object Level Authorization (BOLA / IDOR) Guard
Every endpoint containing `:repoId` or `:docId` must execute the `verifyRepositoryOwnership` middleware:

```typescript
// gateway/src/middleware/authGuard.ts
export async function verifyRepositoryOwnership(req: Request, res: Response, next: NextFunction) {
  const { repoId } = req.params;
  const userId = req.user.id; // From verified JWT

  if (!isValidUUIDv4(repoId)) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_PARAM", message: "Invalid repository UUID identifier." }
    });
  }

  const repository = await prisma.repository.findFirst({
    where: { id: repoId, userId: userId }
  });

  if (!repository) {
    // Return 404 to avoid leaking existence of another tenant's repository ID
    return res.status(404).json({
      success: false,
      error: { code: "REPOSITORY_NOT_FOUND", message: "Repository not found." }
    });
  }

  req.repository = repository;
  next();
}
```

---

## 3. Authentication & Session API (`/api/v1/auth`)

### 3.1 Register User Account
* **Endpoint:** `POST /api/v1/auth/register`
* **Access Control:** Public (Rate Limited: 5 requests / 15 minutes per IP)
* **Description:** Creates a new user profile with a hashed password.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Payload (Zod: `RegisterInputSchema`)
```json
{
  "name": "Dr. Elena Vance",
  "email": "elena.vance@stanford.edu",
  "password": "SuperSecurePassword123!"
}
```
*Validation Rules:*
* `name`: string, min 2, max 150 characters, trimmed.
* `email`: string, valid email format, converted to lowercase, max 255 chars.
* `password`: string, min 10, max 100 characters. Must contain $\ge 1$ uppercase, $\ge 1$ lowercase, $\ge 1$ digit, and $\ge 1$ special character (`[!@#$%^&*]`).

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "8b5a32b9-6239-445a-9391-e37452d308f2",
      "name": "Dr. Elena Vance",
      "email": "elena.vance@stanford.edu",
      "createdAt": "2026-10-12T19:00:00.000Z"
    }
  },
  "meta": { "timestamp": "2026-10-12T19:00:00.000Z", "requestId": "req_01" }
}
```

#### Error Responses
* `400 Bad Request`: Payload validation failed (`VALIDATION_ERROR`).
* `409 Conflict`: Email is already registered (`EMAIL_ALREADY_EXISTS`).
* `429 Too Many Requests`: Rate limit threshold exceeded (`RATE_LIMIT_EXCEEDED`).

---

### 3.2 Login User Session
* **Endpoint:** `POST /api/v1/auth/login`
* **Access Control:** Public (Rate Limited: 5 requests / 15 minutes per IP)
* **Description:** Verifies user credentials, issues a short-lived in-memory Access Token, and sets a long-lived Refresh Token in a secure `HttpOnly` cookie.

#### Request Payload (Zod: `LoginInputSchema`)
```json
{
  "email": "elena.vance@stanford.edu",
  "password": "SuperSecurePassword123!"
}
```

#### Success Response (`200 OK`)
```http
HTTP/1.1 200 OK
Content-Type: application/json
Set-Cookie: refreshToken=d290f1ee-6c54-4b01-90e6-d701748f0851; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YjVhMzJiOS02MjM5LTQ0NWEtOTM5MS1lMzc0NTJkMzA4ZjIiLCJlbWFpbCI6ImVsZW5hLnZhbmNlQHN0YW5mb3JkLmVkdSIsImlhdCI6MTcyODc1OTYwMCwiZXhwIjoxNzI4NzYwNTAwfQ.sIgnAtUrE",
    "expiresIn": 900,
    "user": {
      "id": "8b5a32b9-6239-445a-9391-e37452d308f2",
      "name": "Dr. Elena Vance",
      "email": "elena.vance@stanford.edu"
    }
  },
  "meta": { "timestamp": "2026-10-12T19:00:00.000Z", "requestId": "req_02" }
}
```

#### Error Responses
* `401 Unauthorized`: Invalid email or password (`INVALID_CREDENTIALS`).
* `429 Too Many Requests`: Account temporarily locked or IP throttled (`RATE_LIMIT_EXCEEDED`).

---

### 3.3 Silent Refresh Token Rotation (RTR)
* **Endpoint:** `POST /api/v1/auth/refresh`
* **Access Control:** Cookie Authenticated (`refreshToken`)
* **Description:** Rotates the refresh token, revokes the previous token hash, and issues a fresh Access Token and new Refresh Cookie.

#### Request Headers & Cookies
```http
Cookie: refreshToken=d290f1ee-6c54-4b01-90e6-d701748f0851
```

#### Success Response (`200 OK`)
```http
HTTP/1.1 200 OK
Content-Type: application/json
Set-Cookie: refreshToken=f81d4fae-7dec-11d0-a765-00a0c91e6bf6; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW_ACCESS_TOKEN_PAYLOAD.sIgnAtUrE",
    "expiresIn": 900
  },
  "meta": { "timestamp": "2026-10-12T19:15:00.000Z", "requestId": "req_03" }
}
```

#### Error Responses
* `401 Unauthorized`: No refresh token cookie found (`TOKEN_MISSING`).
* `403 Forbidden`: Token expired or token reuse detected (`SESSION_COMPROMISED`). *All active sessions for this user are purged immediately.*

---

### 3.4 Logout Session
* **Endpoint:** `POST /api/v1/auth/logout`
* **Access Control:** Cookie Authenticated
* **Description:** Marks the active refresh token as revoked in PostgreSQL and clears the browser cookie.

#### Success Response (`200 OK`)
```http
HTTP/1.1 200 OK
Set-Cookie: refreshToken=; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=0
```
```json
{
  "success": true,
  "data": { "message": "Successfully logged out." },
  "meta": { "timestamp": "2026-10-12T19:20:00.000Z", "requestId": "req_04" }
}
```

---

### 3.5 Fetch Current User Profile
* **Endpoint:** `GET /api/v1/auth/me`
* **Access Control:** Bearer Authenticated (`Authorization: Bearer <accessToken>`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "8b5a32b9-6239-445a-9391-e37452d308f2",
      "name": "Dr. Elena Vance",
      "email": "elena.vance@stanford.edu",
      "createdAt": "2026-10-12T19:00:00.000Z"
    }
  },
  "meta": { "timestamp": "2026-10-12T19:20:00.000Z", "requestId": "req_05" }
}
```

---

## 4. Workspace Repositories API (`/api/v1/repos`)

### 4.1 List User Repositories
* **Endpoint:** `GET /api/v1/repos`
* **Access Control:** Bearer Authenticated
* **Description:** Returns all repositories created by the authenticated user, ordered by `createdAt DESC`.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "771e8473-b3c1-4b21-837c-f844280bc412",
      "name": "Transformer Architectures & Attention",
      "description": "Foundational literature analyzing attention mechanisms and scaling laws.",
      "colorTag": "#8B5CF6",
      "documentCount": 4,
      "conversationCount": 2,
      "createdAt": "2026-10-12T10:05:00.000Z",
      "updatedAt": "2026-10-12T10:05:00.000Z"
    }
  ],
  "meta": { "timestamp": "2026-10-12T19:25:00.000Z", "requestId": "req_06" }
}
```

---

### 4.2 Create Repository
* **Endpoint:** `POST /api/v1/repos`
* **Access Control:** Bearer Authenticated
* **Description:** Provisions a new isolated workspace repository.

#### Request Payload (Zod: `CreateRepoSchema`)
```json
{
  "name": "Diffusion Models in Medical Imaging",
  "description": "Literature analyzing denoising diffusion probabilistic models for MRI.",
  "colorTag": "#10B981"
}
```
*Validation Rules:*
* `name`: string, min 1, max 120 chars, sanitized.
* `description`: string, optional, max 1000 chars.
* `colorTag`: string, valid 7-character hex color format (e.g. `^#([A-Fa-f0-9]{6})$`).

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "992f811a-12a4-4cc9-b771-331e847300bc",
    "name": "Diffusion Models in Medical Imaging",
    "description": "Literature analyzing denoising diffusion probabilistic models for MRI.",
    "colorTag": "#10B981",
    "documentCount": 0,
    "conversationCount": 0,
    "createdAt": "2026-10-12T19:30:00.000Z",
    "updatedAt": "2026-10-12T19:30:00.000Z"
  },
  "meta": { "timestamp": "2026-10-12T19:30:00.000Z", "requestId": "req_07" }
}
```

---

### 4.3 Delete Repository & Associated Data
* **Endpoint:** `DELETE /api/v1/repos/:repoId`
* **Access Control:** Bearer Authenticated (Owner Only)
* **Description:** Initiates full cascade purge of repository, documents, ChromaDB vectors, and Cloudinary blobs.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "message": "Repository and all associated papers, vectors, and chat histories successfully deleted."
  },
  "meta": { "timestamp": "2026-10-12T19:35:00.000Z", "requestId": "req_08" }
}
```

---

## 5. Multi-Source Literature Discovery API (`/api/v1/repos/:repoId/discovery`)

### 5.1 Federated Paper Search
* **Endpoint:** `GET /api/v1/repos/:repoId/discovery/search`
* **Access Control:** Bearer Authenticated (Owner Only)
* **Description:** Dispatches a query across arXiv, Semantic Scholar, PubMed, and Wikipedia.

#### Query Parameters
| Parameter | Type | Required | Default | Validation / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `q` | `string` | **Yes** | None | Min 2, max 200 chars. URL decoded & sanitized. |
| `sources` | `string` | No | `all` | Comma-separated: `arxiv,semantic_scholar,pubmed,wikipedia` |
| `limit` | `integer` | No | `20` | Min 1, max 50. |
| `page` | `integer` | No | `1` | Min 1. |
| `sortBy` | `string` | No | `relevance`| Allowed: `relevance`, `citations`, `year` |

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "source": "ARXIV",
      "externalId": "1706.03762",
      "title": "Attention Is All You Need",
      "authors": ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit"],
      "publishedYear": 2017,
      "venue": "NeurIPS 2017",
      "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
      "citationCount": 115420,
      "doi": "10.48550/arXiv.1706.03762",
      "pdfDownloadUrl": "https://arxiv.org/pdf/1706.03762.pdf",
      "isAlreadyIngested": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalRecords": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "meta": { "timestamp": "2026-10-12T19:40:00.000Z", "requestId": "req_09" }
}
```

---

## 6. Document Ingestion & Management API (`/api/v1/repos/:repoId/documents`)

### 6.1 Trigger Selective Paper Ingestion
* **Endpoint:** `POST /api/v1/repos/:repoId/documents/ingest`
* **Access Control:** Bearer Authenticated (Owner Only)
* **Description:** Queues selected papers for download, `pikepdf` compression, Cloudinary upload, and ChromaDB vector indexing.

#### Request Payload (Zod: `IngestPapersSchema`)
```json
{
  "papers": [
    {
      "source": "ARXIV",
      "externalId": "1706.03762",
      "title": "Attention Is All You Need",
      "authors": ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit"],
      "abstract": "The dominant sequence transduction models are based on complex recurrent...",
      "pdfDownloadUrl": "https://arxiv.org/pdf/1706.03762.pdf"
    }
  ]
}
```
*Security Checks:*
* `pdfDownloadUrl` is strictly checked against the [SSRF Whitelist](#21-ssrf-prevention-whitelist-specification).
* Checked against existing `Document.externalId` records in PostgreSQL to prevent duplicate ingestion into the same repository.

#### Success Response (`202 Accepted`)
```json
{
  "success": true,
  "data": {
    "queuedCount": 1,
    "jobs": [
      {
        "jobId": "job_991a_4102b",
        "documentId": "b05e26b3-fcbe-4eb8-b997-7c703b44e219",
        "title": "Attention Is All You Need",
        "status": "PENDING",
        "streamUrl": "/api/v1/repos/771e8473-b3c1-4b21-837c-f844280bc412/documents/ingest/job_991a_4102b/stream"
      }
    ]
  },
  "meta": { "timestamp": "2026-10-12T19:45:00.000Z", "requestId": "req_10" }
}
```

---

### 6.2 SSE Ingestion Progress Stream
* **Endpoint:** `GET /api/v1/repos/:repoId/documents/:docId/progress?jobId=:jobId`
* **Access Control:** Bearer Authenticated (`Authorization: Bearer <token>` or `?token=<token>` query parameter for browser `EventSource` clients)
* **Protocol:** Server-Sent Events (`text/event-stream`)
* **Description:** Emits real-time progression milestones from FastAPI back to the Next.js client.

#### Wire Format Stream Payloads
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
Transfer-Encoding: chunked

event: progress
data: {"jobId":"job_991a_4102b","step":"FETCHING_PDF","percent":15,"message":"Downloading PDF from arXiv mirror..."}

event: progress
data: {"jobId":"job_991a_4102b","step":"OPTIMIZING_PDF","percent":35,"message":"Compressing streams and repairing xref tables via pikepdf..."}

event: progress
data: {"jobId":"job_991a_4102b","step":"UPLOADING_CLOUD","percent":55,"message":"Securing optimized PDF in Cloudinary storage..."}

event: progress
data: {"jobId":"job_991a_4102b","step":"CHUNKING_TEXT","percent":75,"message":"Extracting layout and generating page-bounded semantic chunks..."}

event: progress
data: {"jobId":"job_991a_4102b","step":"INDEXING_VECTORS","percent":90,"message":"Embedding chunks and writing to ChromaDB with tenant tags..."}

event: complete
data: {"jobId":"job_991a_4102b","documentId":"b05e26b3-fcbe-4eb8-b997-7c703b44e219","percent":100,"status":"INDEXED"}
```

---

### 6.3 List Ingested Documents in Workspace
* **Endpoint:** `GET /api/v1/repos/:repoId/documents`
* **Access Control:** Bearer Authenticated (Owner Only)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "b05e26b3-fcbe-4eb8-b997-7c703b44e219",
      "title": "Attention Is All You Need",
      "authors": ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit"],
      "source": "ARXIV",
      "externalId": "1706.03762",
      "cloudinaryUrl": "https://res.cloudinary.com/research-buddy/raw/upload/v1728731/doc.pdf",
      "fileSizeBytesRaw": 2215000,
      "fileSizeBytesComp": 842000,
      "pageCount": 15,
      "status": "INDEXED",
      "createdAt": "2026-10-12T10:10:00.000Z"
    }
  ],
  "meta": { "timestamp": "2026-10-12T19:50:00.000Z", "requestId": "req_11" }
}
```

---

### 6.4 Delete Document from Repository
* **Endpoint:** `DELETE /api/v1/repos/:repoId/documents/:docId`
* **Access Control:** Bearer Authenticated (Owner Only)
* **Description:** Deletes PostgreSQL record, purges all associated chunk vectors in ChromaDB, and removes the PDF asset from Cloudinary.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": { "message": "Document, vector embeddings, and PDF binary successfully removed." },
  "meta": { "timestamp": "2026-10-12T19:55:00.000Z", "requestId": "req_12" }
}
```

---

## 7. Conversational RAG & Streaming API (`/api/v1/repos/:repoId/chats`)

### 7.1 List Workspace Conversations
* **Endpoint:** `GET /api/v1/repos/:repoId/chats`
* **Access Control:** Bearer Authenticated (Owner Only)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "f51c7209-450a-4281-b668-23091e4a00bc",
      "title": "Attention Mechanism Complexity",
      "messageCount": 6,
      "createdAt": "2026-10-12T10:14:00.000Z",
      "updatedAt": "2026-10-12T10:18:00.000Z"
    }
  ],
  "meta": { "timestamp": "2026-10-12T20:00:00.000Z", "requestId": "req_13" }
}
```

---

### 7.2 Fetch Conversation Message History
* **Endpoint:** `GET /api/v1/repos/:repoId/chats/:chatId/messages`
* **Access Control:** Bearer Authenticated (Owner Only)
* **Description:** Returns chronological chat messages with structured JSONB citations.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "c11a-user-prompt",
      "role": "USER",
      "content": "Why is scaled dot-product attention preferred over additive attention?",
      "citations": null,
      "createdAt": "2026-10-12T10:15:00.000Z"
    },
    {
      "id": "c12b-assistant-answer",
      "role": "ASSISTANT",
      "content": "Scaled dot-product attention is preferred because it is faster and much more space-efficient in practice, as it can leverage highly optimized matrix multiplication code [Doc: Attention Is All You Need, Page: 4].",
      "citations": [
        {
          "citationId": "cite_01",
          "docId": "b05e26b3-fcbe-4eb8-b997-7c703b44e219",
          "docTitle": "Attention Is All You Need",
          "pageNumber": 4,
          "snippet": "Dot-product attention is much faster and more space-efficient in practice, since it can be implemented using highly optimized matrix multiplication code."
        }
      ],
      "tokenCount": 84,
      "createdAt": "2026-10-12T10:15:04.000Z"
    }
  ],
  "meta": { "timestamp": "2026-10-12T20:05:00.000Z", "requestId": "req_14" }
}
```

---

### 7.3 Stream Grounded RAG Generation (SSE)
* **Endpoint:** `POST /api/v1/repos/:repoId/chats/:chatId/stream`
* **Access Control:** Bearer Authenticated (Owner Only)
* **Protocol:** Server-Sent Events (`text/event-stream`)
* **Description:** Dispatches user prompt, executes zero-trust ChromaDB retrieval, constructs grounded prompt, and streams generated tokens followed by citation tags.

#### Request Payload (Zod: `SendChatMessageSchema`)
```json
{
  "prompt": "What is the computational complexity of self-attention per layer?"
}
```

#### Wire Format Event Stream
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
Transfer-Encoding: chunked

: keepalive

event: token
data: {"token":"The "}

event: token
data: {"token":"computational "}

event: token
data: {"token":"complexity "}

event: token
data: {"token":"is "}

event: token
data: {"token":"O(n^2 * d) "}

event: token
data: {"token":"per layer [Doc: Attention Is All You Need, Page: 6]."}

event: citations
data: {
  "citations": [
    {
      "citationId": "cite_02",
      "docId": "b05e26b3-fcbe-4eb8-b997-7c703b44e219",
      "docTitle": "Attention Is All You Need",
      "pageNumber": 6,
      "snippet": "Self-Attention per layer has complexity O(n^2 * d) with sequential operations O(1)..."
    }
  ]
}

event: done
data: {"messageId":"d4e21a78-98e3-4c91-a15e-8812c3f4091a","tokenCount":72,"finishReason":"stop"}
```

*Heartbeat Keep-Alive:* Every 15 seconds of idle LLM generation, the server emits a comment ping (`: keepalive\n\n`) to prevent corporate proxies and Cloudflare edge workers from timing out the HTTP connection.

---

## 8. Internal Microservice API: Gateway to FastAPI (`/internal/v1`)

The FastAPI service runs in an isolated private Docker / VPC network. All routes require an internal service header:
```http
X-Internal-Service-Key: <GENAI_INTERNAL_SECRET>
```

### 8.1 Internal Route Catalog

| Method | Endpoint | Description | Inbound Headers / Payload | Outbound Format |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Liveness & ChromaDB status | `X-Internal-Service-Key` | JSON: `{"status": "ok", "chroma": true}` |
| `POST` | `/discovery/search` | Federated search execution | `{ query, sources, limit, page }` | JSON: `List[DiscoveredPaper]` |
| `POST` | `/ingest/process` | Download, pikepdf, Cloudinary, ChromaDB | `{ jobId, userId, repoId, docId, downloadUrl, title, authors }` | Returns `202 Accepted` + spawns async task |
| `GET` | `/ingest/jobs/:jobId/stream` | Internal SSE proxy source | Job ID in path | `text/event-stream` (Ingestion events) |
| `POST` | `/rag/stream` | Zero-trust Chroma query + LLM Stream | `{ userId, repoId, prompt, history: [] }` | `text/event-stream` (Token & citation events) |
| `POST` | `/cleanup/document` | Purge Chroma vectors + Cloudinary blob | `{ userId, repoId, docId, cloudinaryPublicId }` | JSON: `{"purged": true}` |
| `POST` | `/cleanup/repository` | Purge all repo vectors & assets | `{ userId, repoId, publicIds: [] }` | JSON: `{"purged": true}` |

---

## 9. Error Catalog & Rate Limiting Thresholds

### 9.1 Standard Error Code Catalog

| Error Code | HTTP Status | Description | Action Required |
| :--- | :--- | :--- | :--- |
| `VALIDATION_ERROR` | `400` | Inbound payload failed Zod / Pydantic schema validation. | Inspect `error.details` array for field errors. |
| `SSRF_ATTEMPT_BLOCKED` | `400` | Download URL violated security whitelist. | Provide verified academic domain URL. |
| `FILE_TOO_LARGE` | `400` | PDF binary exceeds 50MB limit. | Ingest compressed or shorter document. |
| `PAGE_LIMIT_EXCEEDED` | `400` | Document exceeds 100-page threshold. | Split paper into relevant section extracts. |
| `INVALID_CREDENTIALS` | `401` | Password or email did not match database records. | Re-enter user credentials. |
| `TOKEN_EXPIRED` | `401` | Access token has expired ($> 15$ mins). | Invoke silent refresh via `/auth/refresh`. |
| `SESSION_COMPROMISED` | `403` | Refresh token reuse detected (Theft Anomaly). | User logged out; re-authentication required. |
| `REPOSITORY_NOT_FOUND` | `404` | Repository does not exist or user is not owner. | Verify workspace ID. |
| `DOCUMENT_NOT_FOUND` | `404` | Document ID does not exist in active workspace. | Refresh repository document list. |
| `EMAIL_ALREADY_EXISTS`| `409` | Email address already registered. | Sign in or use alternate email. |
| `DOCUMENT_DUPLICATE` | `409` | Paper with this external ID already exists in repo. | Paper already indexed in workspace. |
| `RATE_LIMIT_EXCEEDED` | `429` | Request threshold exceeded for IP or user. | Wait until cooldown expires. |
| `EXTERNAL_API_UNAVAILABLE` | `502` | External academic service returned 5xx or timed out. | Retry with fallback sources. |
| `INTERNAL_GENAI_ERROR` | `500` | Unhandled exception in Python FastAPI service. | Check microservice logs. |

### 9.2 Rate Limiting Threshold Policies

```typescript
// gateway/src/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";

// 1. Authentication Endpoints: 5 requests per 15 minutes per IP
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many authentication attempts. Please try again in 15 minutes." }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 2. Paper Discovery: 20 requests per minute per authenticated user
export const discoveryRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    error: { code: "RATE_LIMIT_EXCEEDED", message: "Discovery search rate limit reached. Please wait a moment." }
  }
});

// 3. RAG Chat Stream: 15 questions per minute per authenticated user
export const chatStreamRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    error: { code: "RATE_LIMIT_EXCEEDED", message: "Chat query rate limit reached. Please wait a moment." }
  }
});
```

---

## 10. Conclusion & Implementation Sign-off
This document defines the complete API contracts, security protections, request/response envelopes, and streaming behaviors for ResearchBuddy. All client API integrations, Express Gateway route controllers, and FastAPI endpoints must strictly conform to the schemas and security policies detailed herein.
