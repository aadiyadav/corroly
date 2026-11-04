# Research Paper Synthesizer (ResearchBuddy)
## Comprehensive End-to-End Implementation Plan (0 to 100)

*Document Identifier:* `PLAN-SPEC-006`  
*Version:* `1.0.0`  
*Status:* Approved for Execution  
*Execution Model:* Sequential Phased Delivery with Complete In-One-Go Implementations & Re-checks  
*Target Environments:* Development, Staging, Production  

---

## Table of Contents
1. [Execution Principles & Phasing Strategy](#1-execution-principles--phasing-strategy)
2. [Phase 1: Project Architecture & Boilerplate Foundation](#2-phase-1-project-architecture--boilerplate-foundation)
3. [Phase 2: Database Setup & Dual Schema Definition](#3-phase-2-database-setup--dual-schema-definition)
4. [Phase 3: GenAI Microservice & Core LLM Subsystems (FastAPI)](#4-phase-3-genai-microservice--core-llm-subsystems-fastapi)
5. [Phase 4: Cloudinary Object Storage Subsystem](#5-phase-4-cloudinary-object-storage-subsystem)
6. [Phase 5: Backend API server Development (Node.js/Express)](#6-phase-5-backend-api-server-development-nodejsexpress)
7. [Phase 6: Frontend Foundation, Styling & Redux State Management](#7-phase-6-frontend-foundation-styling--redux-state-management)
8. [Phase 7: UI Components & Page Views Development](#8-phase-7-ui-components--page-views-development)
9. [Phase 8: Security Hardening, Production Resilience & Index Audits](#9-phase-8-security-hardening-production-resilience--index-audits)
10. [Environment Variables Blueprint (`.env.example` Inventory)](#10-environment-variables-blueprint-envexample-inventory)

---

## 1. Execution Principles & Phasing Strategy

To ensure zero architectural regression, flawless integration, and enterprise-grade code quality, implementation follows four non-negotiable rules:

1. **Deterministic Phase Order:** Development strictly follows Phases 1 through 8. No downstream UI component is written before its backing API, database models, and vector pipelines are verified.
2. **Complete One-Go Implementation per Phase:** Each phase and its sub-steps will be developed completely in one go, with thorough verification against all previous specifications ([`1_TECH_STACK_AND_ARCHITECTURE.md`](file:///d:/Coding/My%20Projects/research-buddy/Docs/1_TECH_STACK_AND_ARCHITECTURE.md), [`2_DATABASE_SCHEMA_AND_ERD.md`](file:///d:/Coding/My%20Projects/research-buddy/Docs/2_DATABASE_SCHEMA_AND_ERD.md), [`3_WORKFLOW_AND_STATE_MACHINES.md`](file:///d:/Coding/My%20Projects/research-buddy/Docs/3_WORKFLOW_AND_STATE_MACHINES.md), [`4_API_SPECIFICATION_AND_DATA_CONTRACTS.md`](file:///d:/Coding/My%20Projects/research-buddy/Docs/4_API_SPECIFICATION_AND_DATA_CONTRACTS.md), and [`5_UI_UX_DESIGN_SPECIFICATION.md`](file:///d:/Coding/My%20Projects/research-buddy/Docs/5_UI_UX_DESIGN_SPECIFICATION.md)).
3. **Environment Isolation via `.env.example`:** Every service folder contains a strongly documented `.env.example` file specifying all required keys, formats, and defaults.
4. **Execution Discipline:** Build tools, test runners, or git commands will never be executed without explicit instruction.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         END-TO-END EXECUTION ROADMAP                             │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Phase 1: Boilerplate Architecture Setup (server, ai-service, client)            │
│    │                                                                             │
│    ▼                                                                             │
│ Phase 2: Dual Database Schemas (PostgreSQL / Prisma + ChromaDB Vector Index)     │
│    │                                                                             │
│    ▼                                                                             │
│ Phase 3: Python GenAI Subsystems (arXiv, S2, PubMed, pikepdf, PyMuPDF, RAG, SSE)│
│    │                                                                             │
│    ▼                                                                             │
│ Phase 4: Cloudinary Storage Integration (Stream Uploads, URL Generation, Delete) │
│    │                                                                             │
│    ▼                                                                             │
│ Phase 5: Node.js server API (Auth, RTR, Repos, Docs, SSE Proxies, Zod Guards)   │
│    │                                                                             │
│    ▼                                                                             │
│ Phase 6: Frontend Core (Single index.css, Geist Fonts, Redux 5-Slice Store)     │
│    │                                                                             │
│    ▼                                                                             │
│ Phase 7: UI Components & Pages (Floating Nav, Dashboard, Discovery, Split RAG)   │
│    │                                                                             │
│    ▼                                                                             │
│ Phase 8: Production Hardening (Rate Limiting, SSRF Whitelist, BOLA, DB Indexes)  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1: Project Architecture & Boilerplate Foundation

**Objective:** Establish the complete polyglot monorepo structure, package manifests, configuration files, and initial scaffolding across all three decoupled services.

### Sub-Steps & Deliverables:
* **Sub-step 1.1: Root Repository Layout & Configuration**
  * Create folder structure: `server/`, `ai-service/`, `client/`, `Docs/`.
  * Create root `.gitignore` ignoring `node_modules/`, `__pycache__/`, `.env`, `.venv/`, `dist/`, `.next/`, `chroma_data/`.
* **Sub-step 1.2: Backend Server Scaffolding (`server/`)**
  * Initialize `server/package.json` with dependencies: `express`, `@prisma/client`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `cors`, `helmet`, `express-rate-limit`, `zod`, `axios`.
  * Dev dependencies: `typescript`, `@types/node`, `@types/express`, `@types/jsonwebtoken`, `@types/bcryptjs`, `@types/cookie-parser`, `@types/cors`, `prisma`, `tsx`, `nodemon`.
  * Configure `server/tsconfig.json` (strict TypeScript, ES2022 target, NodeNext module resolution).
  * Run `npm install` inside `server/` to install all runtime and development packages.
  * Create entry point `server/src/index.ts` with basic Express setup, JSON parser, and health check route.
  * Create `server/.env.example`.
* **Sub-step 1.3: GenAI Microservice Scaffolding (`ai-service/`)**
  * Initialize `ai-service/requirements.txt` with dependencies: `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`, `langchain`, `langchain-community`, `langchain-google-genai`, `pikepdf`, `PyMuPDF`, `chromadb`, `google-genai`, `sse-starlette`, `cloudinary`, `httpx`, `tenacity`, `python-dotenv`.
  * Configure Python virtual environment or verify Python 3.10+ package dependencies.
  * Configure `ai-service/pyproject.toml` for code formatting (Black, Flake8/Ruff).
  * Create entry point `ai-service/app/main.py` with FastAPI initialization, CORS, and internal health check.
  * Create `ai-service/.env.example`.
* **Sub-step 1.4: Frontend Client Scaffolding (`client/`)**
  * Initialize `client/package.json` with Next.js 14+ (App Router), React 18+, `@reduxjs/toolkit`, `react-redux`, `lucide-react`, `axios`, `react-pdf`, `pdfjs-dist`, `tailwindcss`, `postcss`, `autoprefixer`.
  * Configure `client/tsconfig.json` with path aliases (`@/*`).
  * Configure `client/tailwind.config.js` with project content paths, 5-color palette, and Geist font.
  * Configure `client/postcss.config.js` and `client/next.config.js`.
  * Run `npm install` inside `client/` to install all Next.js, React, Tailwind, and Redux dependencies.
  * Create master single stylesheet `client/src/app/index.css`.
  * Create root `layout.tsx` and initial landing `page.tsx`.
  * Create `client/.env.example`.

### Acceptance & Verification Criteria:
1. All services have their node_modules and dependency environments properly installed and verified.
2. Zero module resolution errors in TypeScript / IDE across `server/` and `client/`.
3. Clear separation between server, client, and AI microservice with zero circular dependencies.
4. Every required environment variable is documented in corresponding `.env.example` files.

---

## 3. Phase 2: Database Setup & Dual Schema Definition

**Objective:** Configure relational PostgreSQL storage via Prisma ORM and the ChromaDB high-dimensional vector store, establishing complete data contracts and tenant boundaries.

### Sub-Steps & Deliverables:
* **Sub-step 2.1: Prisma Schema Definition (`server/prisma/schema.prisma`)**
  * Define PostgreSQL datasource and generator with `previewFeatures = ["relationJoins"]`.
  * Define enums: `DocumentSource`, `IngestionStatus`, `MessageRole`.
  * Define models:
    * `User` (UUID PK, email UK, passwordHash, name, createdAt, updatedAt — *no role field*).
    * `RefreshToken` (UUID PK, tokenHash UK, userId FK with `onDelete: Cascade`, isRevoked, expiresAt).
    * `Repository` (UUID PK, name, description, colorTag, userId FK with `onDelete: Cascade`).
    * `Document` (UUID PK, repositoryId FK, title, authors, abstract, source, externalId, cloudinaryUrl, cloudinaryPublicId, file sizes, pageCount, status, errorMessage).
    * `Conversation` (UUID PK, repositoryId FK, title).
    * `ChatMessage` (UUID PK, conversationId FK, role, content, JSONB `citations`, tokenCount).
  * Configure compound indexes: `[userId, createdAt]`, `[repositoryId, status]`, `[conversationId, createdAt]`, `[externalId]`.
* **Sub-step 2.2: Prisma Service & Database Client Setup**
  * Create `server/src/lib/prisma.ts` singleton client with connection lifecycle management.
  * Verify database migration SQL scripts match the specification in [`2_DATABASE_SCHEMA_AND_ERD.md`](file:///d:/Coding/My%20Projects/research-buddy/Docs/2_DATABASE_SCHEMA_AND_ERD.md).
* **Sub-step 2.3: ChromaDB Vector Store Client Setup**
  * Create `ai-service/app/services/vector/chroma_client.py`.
  * Initialize persistent ChromaDB client pointing to `CHROMA_PERSIST_DIRECTORY`.
  * Create/get collection `research_paper_embeddings` configured with cosine distance metric (`{"hnsw:space": "cosine"}`).
* **Sub-step 2.4: ChromaDB Compound Tenant Filtering Helpers**
  * Implement filter constructor guaranteeing injection of `{"$and": [{"user_id": uid}, {"repository_id": rid}]}` into every search query.

### Acceptance & Verification Criteria:
1. `schema.prisma` compiles without errors and strictly matches [`2_DATABASE_SCHEMA_AND_ERD.md`](file:///d:/Coding/My%20Projects/research-buddy/Docs/2_DATABASE_SCHEMA_AND_ERD.md).
2. ChromaDB client initializes and enforces compound multi-tenant query dictionaries.

---

## 4. Phase 3: GenAI Microservice & Core LLM Subsystems (FastAPI)

**Objective:** Implement the complete academic literature discovery, PDF structural optimization (`pikepdf`), page-aware parsing (PyMuPDF), semantic chunking, and grounded conversational RAG streaming pipeline.

### Sub-Steps & Deliverables:
* **Sub-step 3.1: Multi-Source Literature Discovery Adapters**
  * `ai-service/app/services/discovery/arxiv_client.py`: Integrates `ArxivLoader` & arXiv API with query normalization, abstract fetching, and PDF URL extraction.
  * `ai-service/app/services/discovery/s2_client.py`: Semantic Scholar Academic Graph client fetching paper titles, authors, DOIs, citation counts, and open-access links.
  * `ai-service/app/services/discovery/pubmed_client.py`: `PubMedLoader` wrapper querying NCBI Entrez for biomedical literature.
  * `ai-service/app/services/discovery/wiki_client.py`: `WikipediaLoader` wrapper for technical terminology definitions.
  * `ai-service/app/services/discovery/aggregator.py`: Dispatches parallel queries via `asyncio.gather()`, normalizes records to `DiscoveredPaper`, deduplicates by title/DOI, and ranks by relevance and citations.
* **Sub-step 3.2: PDF Binary Compression & Repair Engine (`pikepdf`)**
  * `ai-service/app/services/compression/pike_optimizer.py`:
    * Loads raw PDF buffer into memory (`io.BytesIO`).
    * Reconstructs corrupted cross-reference (`xref`) tables and broken trailers.
    * Applies `linearize=True` ("Fast Web View" for immediate page 1 browser rendering).
    * Applies `compress_streams=True` and `object_stream_mode=generate` without loss of visual/font resolution.
    * Returns optimized byte stream with size reduction and page count metrics.
* **Sub-step 3.3: Page-Aware Layout & Text Extraction (PyMuPDF `fitz`)**
  * `ai-service/app/services/extraction/mupdf_extractor.py`:
    * Opens PDF byte stream via `fitz.open()`.
    * Extracts structured text per page preserving academic reading order across multi-column layouts.
    * Detects scanned/empty documents ($< 50$ chars across 3 pages) and flags OCR requirement.
* **Sub-step 3.4: Deterministic Page-Bounded Semantic Chunking**
  * `ai-service/app/services/chunking/text_splitter.py`:
    * Uses `RecursiveCharacterTextSplitter` with scientific separators (`\n\n## `, `\n\n### `, `\n\n`, `\n`, `. `, ` `).
    * Enforces **strict page boundaries** (chunks never cross page edges) ensuring 100% deterministic citation accuracy.
    * Injects scalar metadata: `user_id`, `repository_id`, `document_id`, `document_title`, `page_number`, `chunk_index`.
* **Sub-step 3.5: Vector Embedding & ChromaDB Upserting**
  * `ai-service/app/services/vector/embedding_service.py`: Generates dense vector embeddings in batches and upserts into ChromaDB collection.
* **Sub-step 3.6: Grounded RAG Retrieval Chain & Citation Verification**
  * `ai-service/app/services/rag/rag_service.py`:
    * Performs compound filtered retrieval in ChromaDB (`user_id` AND `repository_id`).
    * Formats retrieved context blocks with explicit source brackets: `[SOURCE N] Document: <Title>, Page: <Page>`.
    * Injects strict grounding directives banning hallucination.
    * Uses regex parser to extract emitted `[Doc: <Title>, Page: <PageNum>]` tags and verify them against retrieved context.
* **Sub-step 3.7: SSE Event Streaming Handlers**
  * Implement SSE endpoints using `sse-starlette` emitting:
    * Ingestion progress: `event: progress` with percentage milestones (`15%` $\to$ `100%`).
    * RAG tokens: `event: token`, `event: citations`, and `event: done`.

### Acceptance & Verification Criteria:
1. `pikepdf` compression produces valid, linearized PDF byte buffers with 20%–60% footprint reduction.
2. PyMuPDF extraction preserves exact page numbers on all chunks.
3. RAG answers strictly include verifiable `[Doc: ..., Page: ...]` citation badges.
4. SSE events stream smoothly with chunked transfer encoding.

---

## 5. Phase 4: Cloudinary Object Storage Subsystem

**Objective:** Configure cloud blob hosting for compressed academic PDFs, isolating binaries from PostgreSQL and managing secure asset lifecycles.

### Sub-Steps & Deliverables:
* **Sub-step 4.1: Cloudinary Python SDK Integration**
  * `ai-service/app/services/storage/cloudinary_svc.py`: Configures `cloudinary` with credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
* **Sub-step 4.2: In-Memory Stream Upload Method**
  * Implement `upload_pdf_stream()` using `cloudinary.uploader.upload_large()` directly from the in-memory `BytesIO` buffer produced by `pikepdf`.
  * Avoids writing temporary PDF files to local disk.
* **Sub-step 4.3: Tenant Path Taxonomy & Metadata Extraction**
  * Asset path hierarchy: `research_buddy/users/{user_id}/repos/{repo_id}/{doc_id}.pdf`.
  * Extracts permanent canonical HTTPS URL (`secure_url`) and `public_id` for PostgreSQL storage.
* **Sub-step 4.4: Asset Deletion Service**
  * Implement `delete_pdf_asset(public_id)` for single document deletion.
  * Implement `delete_repository_folder(prefix)` for cascading workspace deletion.

### Acceptance & Verification Criteria:
1. Compressed PDFs upload directly from memory to Cloudinary without disk I/O.
2. Canonical secure URLs are generated and returned for PostgreSQL persistence.
3. Asset deletion purges files from Cloudinary CDN storage.

---

## 6. Phase 5: Backend Server API Development (Node.js/Express)

**Objective:** Build the Node.js backend server handling security guards, dual-token JWT authentication with RTR, Prisma database mutations, and SSE proxying to the Python microservice.

### Sub-Steps & Deliverables:
* **Sub-step 5.1: Middleware Infrastructure**
  * `server/src/middleware/cors.ts`: Restricts CORS to Next.js client origin (`http://localhost:3000` in dev, production domain in prod) with `credentials: true`.
  * `server/src/middleware/helmet.ts`: Standard security headers.
  * `server/src/middleware/rateLimiter.ts`: Sliding-window limiters for auth, discovery, and chat.
  * `server/src/middleware/errorHandler.ts`: Uniform JSON error response formatter.
* **Sub-step 5.2: Authentication Module with 2-Token JWT & RTR**
  * `server/src/utils/tokenUtils.ts`: Signs short-lived Access Tokens (15 min) and generates cryptographic Refresh Tokens (7 days).
  * `server/src/controllers/authController.ts`:
    * `POST /api/v1/auth/register`: Validates payload, hashes password with bcrypt, creates `User`.
    * `POST /api/v1/auth/login`: Verifies password, generates token pair, saves SHA-256 refresh hash, sets `HttpOnly` cookie.
    * `POST /api/v1/auth/refresh`: Validates refresh cookie, detects reuse (purges sessions if reused), rotates token pair.
    * `POST /api/v1/auth/logout`: Revokes token hash, clears cookie.
    * `GET /api/v1/auth/me`: Returns authenticated user profile.
  * `server/src/middleware/authGuard.ts`: Verifies Bearer JWT and injects `req.user`.
* **Sub-step 5.3: Workspace Repositories Module**
  * `server/src/controllers/repoController.ts`: Full CRUD for repositories (`GET /repos`, `POST /repos`, `DELETE /repos/:repoId`).
  * `server/src/middleware/ownershipGuard.ts`: Enforces BOLA protection ensuring `:repoId` belongs to `req.user.id`.
* **Sub-step 5.4: Document Discovery & Ingestion Proxy Module**
  * `server/src/controllers/discoveryController.ts`: Proxies federated search queries to FastAPI with internal auth headers.
  * `server/src/controllers/docController.ts`:
    * `POST /api/v1/repos/:id/documents/ingest`: Validates download URLs against SSRF whitelist, creates `PENDING` document records, and triggers FastAPI ingestion worker.
    * `GET /api/v1/repos/:id/documents/ingest/:jobId/stream`: Proxies SSE ingestion progress stream from FastAPI to client with `Transfer-Encoding: chunked`.
    * `GET /api/v1/repos/:id/documents`: Lists workspace papers.
    * `DELETE /api/v1/repos/:id/documents/:docId`: Atomic deletion in PostgreSQL + triggers vector and Cloudinary cleanup in FastAPI.
* **Sub-step 5.5: Conversational RAG & Chat Proxy Module**
  * `server/src/controllers/chatController.ts`:
    * `GET /api/v1/repos/:id/chats`: Lists conversation threads.
    * `GET /api/v1/repos/:id/chats/:chatId/messages`: Returns chronological message history with JSONB citations.
    * `POST /api/v1/repos/:id/chats/:chatId/stream`: Proxies RAG SSE stream from FastAPI, persists completed message and verified citations to PostgreSQL upon stream completion.
* **Sub-step 5.6: Internal Microservice Client (`server/src/services/genAiClient.ts`)**
  * Axios client configured with `X-Internal-Service-Key` and tenant headers (`X-Tenant-User-Id`, `X-Tenant-Repo-Id`).

### Acceptance & Verification Criteria:
1. Auth routes issue memory-only Access Tokens and `HttpOnly; Secure; SameSite=Strict` Refresh Cookies.
2. Token reuse anomaly triggers instant revocation of all refresh tokens for that user.
3. Every repository and document route strictly checks ownership against PostgreSQL.
4. SSE byte streams are proxied cleanly without buffering or connection drops.

---

## 7. Phase 6: Frontend Foundation, Styling & Redux State Management

**Objective:** Set up the Next.js 14 client, integrate the single master `index.css` stylesheet with Geist typography and 3-tier responsive grid, configure the Redux Toolkit store, and build the Axios interceptor with silent refresh.

### Sub-Steps & Deliverables:
* **Sub-step 6.1: Single Master `src/app/index.css` Stylesheet**
  * Place the complete, production-validated `src/app/index.css` from [`5_UI_UX_DESIGN_SPECIFICATION.md`](file:///d:/Coding/My%20Projects/research-buddy/Docs/5_UI_UX_DESIGN_SPECIFICATION.md#L351-L437):
    * Imports `Geist` (Google Fonts) — *no Geist Mono*.
    * Applies `font-family: 'Geist', sans-serif` globally on `body`.
    * Imports `@tailwind base; @tailwind components; @tailwind utilities;`.
    * Establishes the **strict 3-tier responsive grid** (`> md`, `sm` to `md`, `< sm`).
    * Includes animation keyframes for typewriter dot and citation focus pulse.
* **Sub-step 6.2: Tailwind CSS Configuration (`client/tailwind.config.js`)**
  * Configures exact 5-color palette: `black: '#000000'`, `white: '#ffffff'`, `primary: '#7f1e23'`, `accent: '#ffd4a5'`, `muted: '#737373'`.
  * **Zero borders configured.**
* **Sub-step 6.3: Redux Toolkit Store Setup (`client/src/store/index.ts`)**
  * Configures root store and typed hooks (`useAppDispatch`, `useAppSelector`).
* **Sub-step 6.4: Redux State Slices**
  * `store/slices/authSlice.ts`: `accessToken` (in-memory), `user` profile, `isAuthenticated`.
  * `store/slices/repositorySlice.ts`: `activeRepositoryId`, `repositories` list, loading state.
  * `store/slices/documentSlice.ts`: `documents` list, `ingestionJobs` dictionary tracking progress.
  * `store/slices/chatSlice.ts`: `activeConversationId`, `conversations`, `messages`, `isStreaming`, `streamingBuffer`.
  * `store/slices/uiSlice.ts`: `isReaderOpen`, `activeReaderPage`, `isDiscoveryModalOpen`.
* **Sub-step 6.5: Axios Client & Silent Refresh Interceptor (`client/src/lib/api.ts`)**
  * Injects `Authorization: Bearer <accessToken>` from Redux state on every request.
  * Response interceptor catches `401 Unauthorized`: queues original requests, invokes `POST /auth/refresh`, updates Redux with new access token, and replays failed requests transparently.

### Acceptance & Verification Criteria:
1. Only **one** CSS file exists in the frontend (`src/app/index.css`).
2. Geist font loads globally without any monospace fallback.
3. Redux Toolkit store manages all workspace state centrally.
4. Silent refresh transparently renews expired access tokens without user interruption.

---

## 8. Phase 7: UI Components & Page Views Development

**Objective:** Build all light-themed, tactile frontend components and views using pure in-built Tailwind CSS classes, floating pill geometry, the strict 3-tier responsive layout, and Lucide React icons (zero sparkle icons).

### Sub-Steps & Deliverables:
* **Sub-step 7.1: Global Application Shell & Floating Navbar**
  * `components/layout/FloatingNavbar.tsx`: Floating pill header (`rounded-full shadow-lg bg-white`), logo badge, navigation links, and "New Workspace" CTA button.
  * `components/layout/MobileBottomBar.tsx`: Fixed bottom pill bar (`< sm`) with touch-friendly actions.
* **Sub-step 7.2: Authentication Views**
  * `app/(auth)/login/page.tsx`: Clean, borderless white card with email/password inputs and Crimson submit pill.
  * `app/(auth)/register/page.tsx`: Registration card with validation feedback.
* **Sub-step 7.3: Dashboard & Workspace Grid**
  * `app/(workspace)/dashboard/page.tsx`: Workspace catalog header, search bar, and grid.
  * `components/workspace/WorkspaceCard.tsx`: Borderless elevated cards (`rounded-3xl shadow-md hover:-translate-y-1 hover:shadow-lg`), peach active badges, and document counts.
  * `components/workspace/CreateWorkspaceModal.tsx`: Borderless modal dialog for creating repositories.
* **Sub-step 7.4: Multi-Source Literature Discovery Modal**
  * `components/discovery/DiscoveryModal.tsx`: Search bar pill with Lucide `Search` icon.
  * `components/discovery/SourcePills.tsx`: Filter pills for arXiv, Semantic Scholar, PubMed, and Wikipedia.
  * `components/discovery/PaperResultCard.tsx`: Result card with authors, publish year, abstract, and citation metrics (`[115,420 Citations]`).
  * `components/discovery/IngestionProgressModal.tsx`: Real-time progress bar listening to SSE stream with step indicators (`15%` $\to$ `100%`).
* **Sub-step 7.5: Split-Screen Research Workspace View**
  * `app/(workspace)/repo/[repoId]/page.tsx`: Unified workspace container adapting to the 3-tier responsive grid.
  * Desktop (`> md`): Side-by-side split grid (PDF Reader on left, Chat Console on right).
  * Tablet (`sm to md`): Stacked or tabbed switcher layout.
  * Mobile (`< sm`): Single focused reading canvas with bottom slide-up citation sheet.
* **Sub-step 7.6: Built-in PDF Viewer with Citation Anchoring**
  * `components/reader/PdfViewer.tsx`: Canvas rendering via `react-pdf` / `pdfjs-dist` with Fast Web View linear streaming.
  * `components/reader/PdfToolbar.tsx`: Page navigation, zoom in/out, download.
  * Sentence highlight: Flashes warm peach pulse (`citation-focus-pulse`) on the cited passage when a citation chip is clicked.
* **Sub-step 7.7: Grounded Conversational Chat Console**
  * `components/chat/ChatConsole.tsx`: Scrollable message feed and input prompt bar.
  * `components/chat/MessageBubble.tsx`: User message and AI synthesized answer bubbles.
  * `components/chat/CitationChip.tsx`: Interactive warm peach pill (`bg-[#ffd4a5] text-[#7f1e23] rounded-full text-xs font-semibold hover:-translate-y-0.5 active:scale-95`). Clicking jumps the PDF viewer to the referenced page.
  * `components/chat/PromptInput.tsx`: Floating input pill with Lucide `Send` button.

### Acceptance & Verification Criteria:
1. Every component uses **in-built Tailwind CSS classes**; zero custom CSS classes.
2. **Zero borders** across all cards, modals, pills, and inputs.
3. **No sparkle icons** anywhere in the project; only approved functional Lucide icons.
4. Clicking a citation chip instantly navigates the PDF reader to the target page and highlights the source sentence.
5. Strict 3-tier responsiveness functions properly on desktop (`> md`), tablet (`sm to md`), and mobile (`< sm`).

---

## 9. Phase 8: Security Hardening, Production Resilience & Index Audits

**Objective:** Implement production security controls, rate limiting, SSRF protection, database transaction integrity, connection timeouts, and cascade verification.

### Sub-Steps & Deliverables:
* **Sub-step 8.1: Express Sliding-Window Rate Limiting**
  * Apply `authRateLimiter` (5 req / 15 min per IP) on `/auth/login` and `/auth/register`.
  * Apply `discoveryRateLimiter` (20 req / min per user) on `/discovery/search`.
  * Apply `chatStreamRateLimiter` (15 req / min per user) on `/chats/:id/stream`.
* **Sub-step 8.2: SSRF Domain Whitelist & URL Sanitization**
  * Verify `pdfDownloadUrl` matches HTTPS whitelist (`arxiv.org`, `semanticscholar.org`, `nih.gov`, `wikipedia.org`, `cloudinary.com`).
  * Block internal/private network resolutions (`127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`, etc.).
* **Sub-step 8.3: BOLA / IDOR Verification Audit**
  * Ensure all controller methods access data using compound queries (`where: { id: docId, repository: { userId: req.user.id } }`).
* **Sub-step 8.4: Database Index Audit & Prisma Transactions**
  * Verify all foreign key indexes and compound indexes exist in PostgreSQL.
  * Wrap multi-step relational operations in `prisma.$transaction()`.
* **Sub-step 8.5: SSE Connection Timeouts & Heartbeats**
  * Emit `: keepalive\n\n` comments every 15 seconds during active SSE streams to prevent proxy disconnections.
  * Handle client disconnect socket drops cleanly to terminate upstream LLM generation.
* **Sub-step 8.6: Distributed Cascade Purge Verification**
  * Test repository and document deletion workflows ensuring coordinated erasure across PostgreSQL, ChromaDB, and Cloudinary.

### Acceptance & Verification Criteria:
1. Malicious download URLs are blocked with `SSRF_ATTEMPT_BLOCKED`.
2. Accessing other tenants' UUIDs returns `404 Not Found` without data leakage.
3. Refresh token reuse terminates all sessions for that account.
4. Zero orphan vector chunks or Cloudinary files remain after document or repository deletion.

---

## 10. Environment Variables Blueprint (`.env.example` Inventory)

Below is the complete inventory of environment variables required across the three isolated service directories:

### 10.1 Backend Server `.env.example` (`./server/.env.example`)
```bash
# =============================================================================
# BACKEND SERVER ENVIRONMENT BLUEPRINT (server/)
# =============================================================================
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN="http://localhost:3000"

# PostgreSQL Database Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/research_buddy?schema=public"

# JWT Token Secrets
JWT_ACCESS_SECRET="your-super-secret-access-token-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key-change-in-production"
JWT_ACCESS_EXPIRATION="7d"
JWT_REFRESH_EXPIRATION_DAYS=30

# Internal GenAI Microservice Connection
AI_SERVICE_URL="http://localhost:8000"
GENAI_INTERNAL_SECRET="shared-secret-key-between-server-and-fastapi"
```

### 10.2 GenAI Microservice `.env.example` (`./ai-service/.env.example`)
```bash
# =============================================================================
# GENAI MICROSERVICE ENVIRONMENT BLUEPRINT (ai-service/)
# =============================================================================
PORT=8000
HOST="0.0.0.0"
ENVIRONMENT="development"

# Shared Internal Secret for server Authentication
GENAI_INTERNAL_SECRET="shared-secret-key-between-server-and-fastapi"

# Vector Database (ChromaDB)
CHROMA_PERSIST_DIRECTORY="./chroma_data"
CHROMA_COLLECTION_NAME="research_paper_embeddings"

# LLM & Embeddings Provider (Google Gemini)
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-1.5-pro"
GEMINI_EMBEDDING_MODEL="models/text-embedding-004"

# Cloudinary Cloud Object Storage
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

# External Academic API Credentials (Optional)
SEMANTIC_SCHOLAR_API_KEY=""
NCBI_PUBMED_API_KEY=""
```

### 10.3 Frontend Client `.env.example` (`./client/.env.example`)
```bash
# =============================================================================
# FRONTEND CLIENT ENVIRONMENT BLUEPRINT (client/)
# =============================================================================
NEXT_PUBLIC_API_URL="http://localhost:5000/api/v1"
```

---

## 11. Conclusion & Execution Sign-off
This implementation plan establishes the strict, step-wise roadmap from 0 to 100. Each phase builds directly upon the previous phase without architectural drift. Once approved, development begins immediately with **Phase 1: Project Architecture & Boilerplate Foundation**.
