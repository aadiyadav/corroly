# Research Paper Synthesizer (ResearchBuddy)
## System Architecture & Technical Stack Specification

*Document Identifier:* `ARCH-SPEC-001`  
*Version:* `1.0.0`  
*Status:* Approved for Implementation  
*Target Stack:* Next.js 14+, Node.js/Express, Python 3.10+/FastAPI, PostgreSQL, ChromaDB, Cloudinary  
*Scope:* Full System Architecture, Subsystem Topologies, Technology Selection Rationale, Protocols, and Component Specifications  

---

## Table of Contents
1. [Architectural Principles & Non-Functional Requirements](#1-architectural-principles--non-functional-requirements)
2. [Complete Technology Stack Matrix & Justification](#2-complete-technology-stack-matrix--justification)
3. [System Architecture & Microservices Topology](#3-system-architecture--microservices-topology)
4. [Deep Dive: Client Application Architecture (Next.js)](#4-deep-dive-client-application-architecture-nextjs)
5. [Deep Dive: API Gateway & Orchestrator (Node.js/Express)](#5-deep-dive-api-gateway--orchestrator-nodejsexpress)
6. [Deep Dive: GenAI & Document Processing Microservice (Python/FastAPI)](#6-deep-dive-genai--document-processing-microservice-pythonfastapi)
7. [Storage & Persistence Architecture](#7-storage--persistence-architecture)
8. [Inter-Service Communication & Streaming Protocols](#8-inter-service-communication--streaming-protocols)
9. [Zero-Trust Security & Multi-Tenant Partitioning Model](#9-zero-trust-security--multi-tenant-partitioning-model)
10. [Repository Blueprint & Monorepo Directory Structure](#10-repository-blueprint--monorepo-directory-structure)
11. [Scalability Pathways & Production Readiness Checklist](#11-scalability-pathways--production-readiness-checklist)

---

## 1. Architectural Principles & Non-Functional Requirements

### 1.1 Architectural Principles
The architecture of ResearchBuddy is governed by five non-negotiable engineering principles:

1. **Decoupled Workload Specialization:**
   Compute-intensive neural processing (embedding generation, PDF stream compression, vector calculations) is completely isolated from I/O-intensive transactional workflows (user sessions, repository metadata, permissions). Python handles GenAI tasks; Node.js handles gateway routing; Next.js handles presentation.

2. **Zero-Trust Multi-Tenancy:**
   Multi-tenant boundary enforcement is not an afterthought or an optional query parameter. Every vector retrieval, relational query, and binary access operation must mathematically verify both `user_id` ownership and active `repository_id` workspace constraints.

3. **Lossless Document Fidelity:**
   Scientific papers contain precise formulas, sub/superscripts, figures, tables, and vector glyphs. PDF manipulation must never rasterize text or destroy structural compliance. Optimization via `pikepdf` must be lossless.

4. **Stateless Asynchronous Streaming:**
   Real-time feedback—both ingestion status updates and LLM token generation—must utilize unidirectional Server-Sent Events (SSE) layered over standard HTTP chunked-transfer encoding. Stateful protocols like WebSockets are avoided to eliminate complex connection handshakes, reconnection storms, and sticky-session requirements on load balancers.

5. **Grounded Citation Determinism:**
   LLM output is strictly bounded to retrieved context. Unreferenced assertions are considered system failures. Every factual claim must be accompanied by a verifiable page and document pointer.

### 1.2 Non-Functional Requirements (NFRs)

| Metric | Target | Rationale |
| :--- | :--- | :--- |
| **LLM Time-to-First-Token (TTFT)** | `< 1200ms` | Researchers expect immediate conversational responsiveness. |
| **Vector Retrieval Latency (p99)** | `< 150ms` | Top-K similarity search across ChromaDB must not bottleneck the generation pipeline. |
| **PDF Binary Compression Ratio** | `20% - 60%` | Reduces Cloudinary bandwidth costs and browser client download latency. |
| **Ingestion Pipeline Throughput** | `< 15s` per 20-page paper | Covers download, `pikepdf` compression, Cloudinary upload, PyMuPDF parsing, and vector indexing. |
| **Concurrent Ingestions per Worker** | `4 - 8` parallel jobs | Bound by CPU and memory constraints during PDF parsing and embedding generation. |
| **Client Bundle Size (First Load)** | `< 120 kB` (compressed) | Next.js Server Components ensure heavy libraries (parsers, compilers) remain server-side. |

---

## 2. Complete Technology Stack Matrix & Justification

### 2.1 Technology Stack Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT PRESENTATION LAYER                       │
│ Next.js 14+ (App Router) | React Server Components | Tailwind CSS      │
│ Redux Toolkit (State) | Zod (Validation) | react-pdf / PDF.js (Reader) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / SSE
┌───────────────────────────────────▼────────────────────────────────────┐
│                        API GATEWAY & ORCHESTRATOR                      │
│ Node.js 20+ LTS | Express.js 4/5 | TypeScript 5+ | Prisma ORM 5+       │
│ JWT (Access/Refresh Tokens) | Cookie-Parser | Express-Rate-Limit       │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
       Prisma (SQL) │                               │ Internal HTTP / SSE
                    │                               │ (Service Secret)
┌───────────────────▼─────────────┐ ┌───────────────▼────────────────────┐
│         RELATIONAL DATA         │ │         GenAI MICROSERVICE         │
│ PostgreSQL 15+                  │ │ Python 3.10+ | FastAPI | Uvicorn   │
│ - User accounts                 │ │ LangChain & Community Loaders      │
│ - Repository / Workspace tree   │ │ pikepdf (C++ qpdf optimization)    │
│ - Document relational records   │ │ PyMuPDF (fitz text/layout engine)  │
│ - Chat thread history           │ │ ChromaDB (Vector Store Client)     │
│ - Hashed refresh tokens         │ │ sse-starlette (Streaming Server)   │
└─────────────────────────────────┘ └───────┬──────────────────────┬─────┘
                                            │                      │
                             Binary Uploads │                      │ Embeddings &
                             (Signed HTTPS) │                      │ Vector Queries
                                            │                      │
                             ┌──────────────▼─────┐ ┌──────────────▼─────┐
                             │ CLOUD OBJECT STORE │ │    VECTOR STORE    │
                             │ Cloudinary (Blob)  │ │ ChromaDB (HNSW)    │
                             │ Optimized PDFs     │ │ Tenant-Tagged      │
                             └────────────────────┘ └────────────────────┘
```

### 2.2 Layer-by-Layer Technology Selection & Trade-Off Analysis

#### A. Client Tier: Next.js 14+ (App Router) & Tailwind CSS
* **Chosen:** Next.js 14+ (React Server Components, App Router), Tailwind CSS, Redux Toolkit, `react-pdf`.
* **Alternatives Evaluated:** Single Page Application (Vite + React), Nuxt.js, Remix.
* **Selection Rationale:**
  * **React Server Components (RSC):** Enables server-side pre-rendering of initial workspace metadata, eliminating layout shifts and client-side waterfalls.
  * **Unified Build Pipeline:** Native support for modern Node.js runtimes, automatic code splitting, and zero-config asset bundling.
  * **Tailwind CSS:** Provides atomic utility classes ensuring consistent design tokens, sleek dark mode palettes, and rapid ergonomics development without runtime CSS-in-JS overhead.
  * **Redux Toolkit:** Academic workspaces feature complex, deeply interlinked client state: active repository ID, active document reading pane, zoom levels, live SSE streaming tokens, and queued paper ingestions. RTK provides predictable, centralized state mutation.

#### B. API Gateway: Node.js, Express.js & Prisma ORM
* **Chosen:** Node.js 20+ LTS, Express.js, TypeScript, Prisma ORM.
* **Alternatives Evaluated:** NestJS, Fastify, Go Gin Gateway, Django API Gateway.
* **Selection Rationale:**
  * **Express.js with TypeScript:** Proven enterprise stability, vast middleware ecosystem (CORS, Helmet, Rate Limiter, Cookie Parser), and minimal cognitive overhead.
  * **Prisma ORM:** Provides complete end-to-end type safety between the PostgreSQL relational schema and application code. Eliminates runtime SQL type mismatch bugs, offers declarative migrations, and facilitates clean relational modeling.
  * **Decoupling Gateway from AI:** Node.js excels at high-concurrency, asynchronous I/O operations (handling 10,000+ lightweight web requests per second for auth, metadata CRUD, and session management) without blocking on CPU-heavy Python tasks.

#### C. GenAI Microservice: Python 3.10+, FastAPI & LangChain
* **Chosen:** Python 3.10+, FastAPI, Uvicorn, LangChain, `pikepdf`, PyMuPDF (`fitz`), `sse-starlette`.
* **Alternatives Evaluated:** Python Flask, Django Ninja, Node.js LangChain (JS).
* **Selection Rationale:**
  * **Python AI Ecosystem:** Python is the native ecosystem for high-performance numerical libraries, LangChain loaders, and C++ PDF bindings.
  * **FastAPI:** Built on Starlette and Pydantic, offering asynchronous route handlers (`async/await`), native OpenAPI specification generation, high performance approaching Go/Node, and first-class async generator support for SSE streaming.
  * **LangChain Community Ecosystem:** Direct availability of `ArxivLoader`, `PubMedLoader`, `WikipediaLoader`, and recursive character text splitters out of the box.

#### D. PDF Optimization Engine: `pikepdf` (C++ `qpdf`)
* **Chosen:** `pikepdf` (v8+).
* **Alternatives Evaluated:** `pypdf`, `pdfplumber`, `PyPDF2`, `weasyprint`.
* **Selection Rationale:**
  * **C++ Core Performance:** `pikepdf` is a Python binding to the high-performance C++ `qpdf` library. It operates orders of magnitude faster than pure Python alternatives.
  * **Structural Repair:** Academic repositories host decades-old papers with broken cross-reference (`xref`) tables and non-standard object streams. `pikepdf` automatically repairs broken structural dictionaries without failing.
  * **Linearization ("Fast Web View"):** Restructures PDF binaries so browser PDF viewers can display the first page immediately upon receiving the initial stream packets.
  * **Lossless Stream Compression:** Strips redundant uncompressed object streams without downsampling vector fonts or reducing image resolution below readability.

#### E. PDF Text & Layout Extraction: PyMuPDF (`fitz`)
* **Chosen:** PyMuPDF (`fitz` v1.23+).
* **Alternatives Evaluated:** `pypdf`, `pdfminer.six`, `Tesseract OCR`, `pdf2text`.
* **Selection Rationale:**
  * **Speed:** 10x to 25x faster than `pdfminer.six` and pure-Python text extractors.
  * **Layout & Geometry Awareness:** Extracts structured blocks with font sizes, line heights, bounding boxes, and explicit page numbers—critical for precise citation tracking.
  * **Multi-Column Academic Parsing:** Correctly handles double-column IEEE/ACM layouts without interweaving text columns.

#### F. Relational Database: PostgreSQL 15+
* **Chosen:** PostgreSQL 15+.
* **Alternatives Evaluated:** MySQL, MongoDB, SQLite.
* **Selection Rationale:**
  * Complete ACID guarantees for multi-tenant accounts, repositories, document tracking, and chat logs.
  * Native JSONB column support for storing structured citation payloads (`[{ docId, page, snippet }]`) within chat messages.
  * Robust connection pooling compatibility with PgBouncer.

#### G. Vector Store: ChromaDB
* **Chosen:** ChromaDB (Client-Server / Persistent Mode).
* **Alternatives Evaluated:** Pinecone, Milvus, Weaviate, pgvector.
* **Selection Rationale:**
  * **Zero Operational Complexity:** Embedded or standalone Docker deployment with zero external SaaS subscription costs during development.
  * **Metadata Filtering:** Native compound boolean filtering (`$and`, `$eq`, `$in`) executed at the vector index level, ensuring zero-trust multi-tenant isolation.
  * **Extensibility:** Standardized collection interface allowing migration to distributed vector stores (Qdrant, Milvus) if data scales beyond tens of millions of vectors.

#### H. Object Blob Storage: Cloudinary
* **Chosen:** Cloudinary (Secure PDF Bucket).
* **Alternatives Evaluated:** AWS S3, Google Cloud Storage, Supabase Storage, Local Disk.
* **Selection Rationale:**
  * Managed CDN delivery with global edge caching.
  * Built-in signed URL authorization for private academic assets.
  * REST API and SDK support in both Node.js and Python.

---

## 3. System Architecture & Microservices Topology

### 3.1 High-Level Block Topology

```mermaid
graph TB
    subgraph Users ["Client Devices"]
        Browser["User Browser (Web / Mobile)"]
    end

    subgraph ClientApp ["Presentation Tier (Next.js)"]
        NextServer["Next.js Server (RSC & API Routes)"]
        NextClient["Next.js Client Bundle (SPA Viewport)"]
    end

    subgraph Gateway ["Gateway Tier (Node.js/Express)"]
        APIGateway["Express API Gateway (:5000)"]
        AuthModule["Stateless Auth Engine (JWT / Cookies)"]
        PrismaService["Prisma ORM Client"]
    end

    subgraph GenAI ["GenAI Compute Tier (Python/FastAPI)"]
        FastAPIService["FastAPI Service (:8000)"]
        DiscoveryEngine["Discovery Dispatcher"]
        CompEngine["pikepdf C++ Pipeline"]
        TextEngine["PyMuPDF Parsing Engine"]
        RagEngine["LangChain RAG Streamer"]
    end

    subgraph Datastores ["Persistence & Vector Tier"]
        Postgres[("PostgreSQL (:5432)")]
        Chroma[("ChromaDB Vector Store (:8000/embed)")]
        Cloudinary[("Cloudinary Cloud Storage")]
    end

    subgraph ExternalAPIs ["Academic Open Data Providers"]
        ArxivAPI["arXiv REST & PDF Mirror"]
        S2API["Semantic Scholar Graph API"]
        PubmedAPI["PubMed NCBI E-Utilities"]
        WikiAPI["Wikipedia REST API"]
    end

    Browser <--> NextClient
    NextClient <--> NextServer
    NextClient <-->|REST Requests & SSE Streams| APIGateway

    APIGateway --> AuthModule
    APIGateway --> PrismaService
    PrismaService <--> Postgres

    APIGateway <-->|Internal HTTP + Proxy SSE| FastAPIService

    FastAPIService --> DiscoveryEngine
    DiscoveryEngine <--> ExternalAPIs

    FastAPIService --> CompEngine
    CompEngine --> Cloudinary

    FastAPIService --> TextEngine
    TextEngine --> RagEngine
    RagEngine <--> Chroma
```

### 3.2 Service Boundaries & Port Allocations

| Component | Default Port | Protocol | Public Facing | Authentication Model |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js Web App** | `3000` | HTTP / HTTPS | **Yes** | Client Session / Redux Memory |
| **Node.js API Gateway** | `5000` | HTTP / HTTPS | **Yes** | Bearer JWT (Access) + Cookie (Refresh) |
| **FastAPI GenAI Service** | `8000` | HTTP / HTTPS | **No (Internal Only)** | Header `X-Internal-Service-Key` |
| **PostgreSQL Database** | `5432` | TCP (Postgres) | **No (Internal Only)** | Database User / Password Credentials |
| **ChromaDB Vector Store** | Embedded / `8001` | TCP / Internal | **No (Internal Only)** | Internal Network Isolation |
| **Cloudinary** | `443` | HTTPS | **Yes (Cloud)** | API Key, Secret & Signed Token |

---

## 4. Deep Dive: Client Application Architecture (Next.js)

### 4.1 Routing & App Directory Structure
Next.js 14 App Router organizes user workflows into route groups:

```
src/app/
├── (auth)/
│   ├── layout.tsx                # Centered, distraction-free authentication card layout
│   ├── login/page.tsx            # Login form with email/password validation
│   └── register/page.tsx         # User registration with password strength meter
├── (workspace)/
│   ├── layout.tsx                # Global application shell: top navigation, theme toggle
│   ├── dashboard/
│   │   ├── page.tsx              # Repository grid, storage metrics, recent literature
│   │   └── loading.tsx           # Dashboard skeleton loader
│   └── repo/
│       └── [repoId]/
│           ├── layout.tsx            # Active repository shell: sidebars, repository header
│           ├── page.tsx              # Unified workspace: split reader + chat layout
│           ├── discovery/
│           │   └── page.tsx          # Multi-source paper discovery & ingestion modal
│           └── settings/
│               └── page.tsx          # Repository settings (color, rename, delete)
├── api/                          # Next.js BFF routes (Edge proxies, token forwarders)
├── globals.css                   # Tailwind CSS root directives & CSS custom variables
└── layout.tsx                    # Root HTML shell with Redux Provider & Toast Provider
```

### 4.2 State Management Architecture (Redux Toolkit)

The client application maintains five distinct Redux state slices:

```mermaid
classDiagram
    class RootState {
        +auth: AuthState
        +repository: RepositoryState
        +document: DocumentState
        +chat: ChatState
        +ui: UIState
    }

    class AuthState {
        +accessToken: string | null
        +user: UserProfile | null
        +isAuthenticated: boolean
        +isLoading: boolean
    }

    class RepositoryState {
        +activeRepositoryId: string | null
        +repositories: RepositoryItem[]
        +isLoading: boolean
        +error: string | null
    }

    class DocumentState {
        +documents: DocumentItem[]
        +selectedDocumentId: string | null
        +ingestionJobs: Record~JobId, IngestionProgress~
        +filterQuery: string
    }

    class ChatState {
        +activeConversationId: string | null
        +conversations: ConversationSummary[]
        +messages: ChatMessage[]
        +isStreaming: boolean
        +streamedAnswerBuffer: string
        +activeCitations: Citation[]
    }

    class UIState {
        +isReaderOpen: boolean
        +activeReaderPage: number
        +splitPaneRatio: number
        +isDiscoveryModalOpen: boolean
        +theme: 'dark' | 'light'
    }

    RootState *-- AuthState
    RootState *-- RepositoryState
    RootState *-- DocumentState
    RootState *-- ChatState
    RootState *-- UIState
```

### 4.3 PDF Reader & Citation Anchoring Integration
The client features a split-pane layout with a built-in PDF viewer:
1. **Core Viewer:** Utilizes `react-pdf` (wrapping `pdfjs-dist`) with Web Workers enabled to keep PDF rendering off the main thread.
2. **Page Navigation Controller:** Listens for navigation events triggered from:
   * Manual thumbnail clicks.
   * Direct page input.
   * **Citation Chip Clicks:** When the user clicks an AI citation badge (e.g., `[Doc: Attention Is All You Need, Page: 4]`), the client dispatches an action to `UIState.activeReaderPage = 4`, opens the reader pane if closed, and highlights the target page.
3. **Resizable Split Pane:** Custom drag-handle component persisting user width preferences in `localStorage`.

---

## 5. Deep Dive: API Gateway & Orchestrator (Node.js/Express)

### 5.1 Request Pipeline & Middleware Chain

Every inbound HTTP request to the API Gateway passes through a strict sequential middleware pipeline:

```mermaid
flowchart LR
    Req[Inbound Request] --> CorsMW[CORS Filter]
    CorsMW --> HelmetMW[Helmet Security Headers]
    HelmetMW --> RateLimitMW[Rate Limiter]
    RateLimitMW --> BodyMW[JSON & Cookie Parser]
    BodyMW --> AuthMW{Protected Route?}
    AuthMW -- Yes --> VerifyJWT[Verify Bearer JWT]
    VerifyJWT -- Valid --> ContextMW[Inject req.user Context]
    VerifyJWT -- Expired/Invalid --> Ret401[Return 401 Unauthorized]
    AuthMW -- No --> ValidateZod[Zod Payload Validation]
    ContextMW --> ValidateZod
    ValidateZod -- Valid --> Controller[Route Controller Logic]
    ValidateZod -- Invalid --> Ret422[Return 422 Validation Error]
    Controller --> PrismaDB[(Prisma PostgreSQL)]
    Controller --> PythonAI[(FastAPI GenAI Service)]
```

### 5.2 Token Lifecycle & Refresh Token Rotation (RTR)

ResearchBuddy implements the industry-standard dual-token authentication pattern with automatic reuse detection:

```mermaid
sequenceDiagram
    autonumber
    participant Client as Next.js Client
    participant Gateway as Node.js Gateway
    participant DB as PostgreSQL (Prisma)

    Client->>Gateway: POST /api/v1/auth/login { email, password }
    Gateway->>DB: Query User by email
    DB-->>Gateway: User Record with passwordHash
    Gateway->>Gateway: bcrypt.compare(password, passwordHash)
    Gateway->>Gateway: Generate accessToken (7d, signed with JWT_SECRET)
    Gateway->>Gateway: Generate rawRefreshToken (random UUID or crypto bytes, 30d expiry)
    Gateway->>Gateway: Hash rawRefreshToken (SHA-256)
    Gateway->>DB: INSERT INTO refresh_tokens (tokenHash, userId, expiresAt)
    Gateway-->>Client: Set-Cookie: refreshToken=<raw>; HttpOnly; Secure; SameSite=Lax; Path=/
    Gateway-->>Client: Response Body: { accessToken, user: { id, email, name } }
    Client->>Client: Store accessToken in Redux AuthState (in-memory)

    note over Client,Gateway: Access Token Expiry (7 Days) / Session Restoration
    Client->>Gateway: GET /api/v1/repos (Bearer <expired>)
    Gateway-->>Client: 401 Unauthorized (TOKEN_EXPIRED)

    note over Client,Gateway: Silent Refresh Interceptor (with 60s Concurrency Grace Window)
    Client->>Gateway: POST /api/v1/auth/refresh (Cookie sent automatically)
    Gateway->>Gateway: Hash inbound cookie refreshToken
    alt In Grace Window (Concurrent Re-Request within 60s)
        Gateway-->>Client: Return cached rotated accessToken & refreshToken
    else Token Revoked / Expired Outside Grace Window
        Gateway-->>Client: Clear-Cookie; 401 Unauthorized (TOKEN_REVOKED)
    else Token Valid
        Gateway->>DB: UPDATE refresh_tokens SET isRevoked = true WHERE id = currentToken.id
        Gateway->>Gateway: Generate new accessToken & newRefreshToken (cached for 60s grace window)
        Gateway->>DB: INSERT INTO refresh_tokens (newHash, userId, expiresAt)
        Gateway-->>Client: Set-Cookie: refreshToken=<newRaw>; HttpOnly; Secure; SameSite=Lax; Path=/
        Gateway-->>Client: Response Body: { accessToken: <newAccessToken> }
        Client->>Client: Retry failed request with new accessToken
    end
```

### 5.3 Gateway-to-Microservice Communication
When the Node.js API Gateway forwards ingestion or search requests to the Python FastAPI microservice:
1. It injects a shared internal secret header: `X-Internal-Service-Key: <GENAI_INTERNAL_SECRET>`.
2. It passes verified tenant context in custom headers:
   * `X-Tenant-User-Id: usr_9981a`
   * `X-Tenant-Repo-Id: repo_x9f2a`
3. If an SSE connection is initiated (e.g. streaming LLM responses), the Gateway proxies the raw byte stream directly to the client:
   ```typescript
   res.setHeader('Content-Type', 'text/event-stream');
   res.setHeader('Cache-Control', 'no-cache');
   res.setHeader('Connection', 'keep-alive');
   res.flushHeaders();
   ```

---

## 6. Deep Dive: GenAI & Document Processing Microservice (Python/FastAPI)

### 6.1 Microservice Internal Layering

```
ai-service/
├── app/
│   ├── main.py                   # FastAPI initialization, middleware, routes mounting
│   ├── core/
│   │   ├── config.py             # Pydantic BaseSettings (env vars validation)
│   │   ├── security.py           # Internal API key validation middleware
│   │   └── logging.py            # Structured JSON logging
│   ├── api/
│   │   └── v1/
│   │       ├── router.py         # Main V1 router aggregator
│   │       └── endpoints/
│   │           ├── discovery.py  # Multi-source paper search endpoints
│   │           ├── ingestion.py  # Ingestion kickoff & SSE progress streamer
│   │           └── rag.py        # Conversational RAG SSE streaming endpoint
│   ├── services/
│   │   ├── discovery/            # Academic paper source adapters
│   │   │   ├── arxiv_client.py   # ArxivLoader & direct arXiv API query logic
│   │   │   ├── s2_client.py      # Semantic Scholar Academic Graph client
│   │   │   ├── pubmed_client.py  # PubMedLoader wrapper
│   │   │   └── wiki_client.py    # WikipediaLoader wrapper
│   │   ├── compression/
│   │   │   └── pike_optimizer.py # pikepdf structural compression & repair
│   │   ├── extraction/
│   │   │   └── mupdf_extractor.py# PyMuPDF page-aware text extractor
│   │   ├── chunking/
│   │   │   └── text_splitter.py  # Semantic text splitter with page metadata
│   │   ├── storage/
│   │   │   └── cloudinary_svc.py # Cloudinary signed upload integration
│   │   └── vector/
│   │       └── chroma_client.py  # ChromaDB multi-tenant client wrapper
│   └── models/
│       ├── schemas.py            # Pydantic request/response schemas
│       └── sse_events.py         # Typed SSE event data envelopes
```

### 6.2 Multi-Source Discovery Dispatcher
When a user queries the discovery pipeline, the `discovery.py` endpoint dispatches asynchronous search requests across all configured providers:

```mermaid
sequenceDiagram
    autonumber
    participant Gateway as Node.js Gateway
    participant FastAPI as FastAPI Router
    participant Arxiv as arXiv Adapter
    participant S2 as Semantic Scholar Adapter
    participant PubMed as PubMed Adapter
    participant Wiki as Wikipedia Adapter

    Gateway->>FastAPI: GET /internal/v1/discovery/search?q="Quantum Computing"&sources=all&limit=20
    FastAPI->>FastAPI: Parse query & spawn async tasks

    par Parallel Search Execution
        FastAPI->>Arxiv: fetch_arxiv_papers(q, limit)
        FastAPI->>S2: fetch_s2_papers(q, limit)
        FastAPI->>PubMed: fetch_pubmed_papers(q, limit)
        FastAPI->>Wiki: fetch_wiki_articles(q, limit)
    end

    Arxiv-->>FastAPI: Normalized Paper Records
    S2-->>FastAPI: Normalized Paper Records (Citations, DOIs)
    PubMed-->>FastAPI: Normalized Paper Records (MeSH terms)
    Wiki-->>FastAPI: Normalized Article Summaries

    FastAPI->>FastAPI: Deduplicate by Title / DOI / arXiv ID
    FastAPI->>FastAPI: Rank & Sort by Relevance / Citation Count
    FastAPI-->>Gateway: Unified Normalized JSON List
```

#### Normalized Paper Schema (Pydantic)
```python
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from enum import Enum

class AcademicSource(str, Enum):
    ARXIV = "ARXIV"
    SEMANTIC_SCHOLAR = "SEMANTIC_SCHOLAR"
    PUBMED = "PUBMED"
    WIKIPEDIA = "WIKIPEDIA"

class DiscoveredPaper(BaseModel):
    source: AcademicSource
    external_id: str
    title: str
    authors: List[str]
    published_year: Optional[int] = None
    venue: Optional[str] = None
    abstract: Optional[str] = None
    citation_count: Optional[int] = 0
    pdf_download_url: Optional[str] = None
    doi: Optional[str] = None
```

### 6.3 PDF Binary Optimization Engine (`pikepdf`)
The `pike_optimizer.py` module executes four deterministic steps on downloaded PDF byte buffers:

```python
import io
import pikepdf

class PDFOptimizationResult:
    def __init__(self, buffer: io.BytesIO, original_size: int, compressed_size: int, page_count: int):
        self.buffer = buffer
        self.original_size = original_size
        self.compressed_size = compressed_size
        self.page_count = page_count
        self.compression_ratio = round((1 - (compressed_size / original_size)) * 100, 2)

def optimize_pdf_buffer(raw_pdf_bytes: bytes) -> PDFOptimizationResult:
    original_size = len(raw_pdf_bytes)
    input_stream = io.BytesIO(raw_pdf_bytes)
    
    # 1. Parse and automatically repair malformed xref tables & broken trailers
    with pikepdf.open(input_stream) as pdf:
        page_count = len(pdf.pages)
        
        # 2. Configure output stream
        output_stream = io.BytesIO()
        
        # 3. Save with stream compression, linearization (Fast Web View), and cleanup
        pdf.save(
            output_stream,
            linearize=True,              # Fast Web View: displays page 1 immediately
            compress_streams=True,        # Flate/Deflate uncompressed streams
            recompress_flate=True,        # Re-deflate sub-optimally compressed streams
            object_stream_mode=pikepdf.ObjectStreamMode.generate, # Merge objects into compressed streams
            normalize_content=False       # Preserve exact visual font glyphs & vector equations
        )
        
    compressed_bytes = output_stream.getvalue()
    compressed_size = len(compressed_bytes)
    output_stream.seek(0)
    
    return PDFOptimizationResult(
        buffer=output_stream,
        original_size=original_size,
        compressed_size=compressed_size,
        page_count=page_count
    )
```

### 6.4 Text Extraction & Page-Aware Semantic Chunking

1. **PyMuPDF Extraction (`mupdf_extractor.py`):**
   ```python
   import fitz # PyMuPDF
   from typing import List, Dict

   def extract_pages_with_metadata(pdf_bytes: bytes) -> List[Dict]:
       doc = fitz.open(stream=pdf_bytes, filetype="pdf")
       extracted_pages = []
       for page_idx, page in enumerate(doc):
           text = page.get_text("text") # Preserves reading order across columns
           extracted_pages.append({
               "page_number": page_idx + 1,
               "text": text
           })
       return extracted_pages
   ```

2. **Semantic Text Splitting (`text_splitter.py`):**
   LangChain's `RecursiveCharacterTextSplitter` is initialized with scientific separators and splits each page independently. This guarantees that **a chunk never spans multiple pages**, ensuring 100% deterministic citation accuracy.

   ```python
   from langchain.text_splitter import RecursiveCharacterTextSplitter
   from typing import List, Dict

   splitter = RecursiveCharacterTextSplitter(
       chunk_size=1000,
       chunk_overlap=200,
       separators=["\n\n## ", "\n\n### ", "\n\n", "\n", ". ", " "]
   )

   def chunk_document_by_pages(pages: List[Dict], doc_id: str, repo_id: str, user_id: str, doc_title: str) -> List[Dict]:
       all_chunks = []
       chunk_counter = 0
       for page in pages:
           raw_text = page["text"]
           page_num = page["page_number"]
           page_chunks = splitter.split_text(raw_text)
           for chunk_text in page_chunks:
               all_chunks.append({
                   "chunk_id": f"{doc_id}_p{page_num}_c{chunk_counter}",
                   "text": chunk_text,
                   "metadata": {
                       "user_id": user_id,
                       "repository_id": repo_id,
                       "document_id": doc_id,
                       "document_title": doc_title,
                       "page_number": page_num,
                       "chunk_index": chunk_counter
                   }
               })
               chunk_counter += 1
       return all_chunks
   ```

---

## 7. Storage & Persistence Architecture

### 7.1 Relational Data Model (PostgreSQL / Prisma)
The complete entity-relationship model guarantees referential integrity through foreign key constraints and cascading deletes:

```mermaid
erDiagram
    User ||--o{ RefreshToken : owns
    User ||--o{ Repository : creates
    Repository ||--o{ Document : contains
    Repository ||--o{ Conversation : hosts
    Conversation ||--o{ ChatMessage : holds

    User {
        string id PK
        string email UK
        string passwordHash
        string name
        datetime createdAt
        datetime updatedAt
    }

    RefreshToken {
        string id PK
        string tokenHash UK
        string userId FK
        boolean isRevoked
        datetime expiresAt
        datetime createdAt
    }

    Repository {
        string id PK
        string name
        string description
        string colorTag
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    Document {
        string id PK
        string repositoryId FK
        string title
        string[] authors
        text abstract
        enum source
        string externalId
        string cloudinaryUrl
        string cloudinaryPublicId
        int fileSizeBytesRaw
        int fileSizeBytesComp
        int pageCount
        enum status
        string errorMessage
        datetime createdAt
        datetime updatedAt
    }

    Conversation {
        string id PK
        string repositoryId FK
        string title
        datetime createdAt
        datetime updatedAt
    }

    ChatMessage {
        string id PK
        string conversationId FK
        enum role
        text content
        jsonb citations
        int tokenCount
        datetime createdAt
    }
```

### 7.2 Cloudinary Storage Schema & Path Hierarchy
Assets in Cloudinary are strictly organized under tenant-partitioned folder hierarchies:
* **Storage Path Template:**  
  `research_buddy/users/{user_id}/repos/{repository_id}/{document_id}.pdf`
* **Access Control:**  
  Deliveries are generated via signed private URLs or authenticated delivery types, ensuring files cannot be enumerated or accessed by unauthorized third parties.

### 7.3 ChromaDB Vector Store Architecture
* **Collection Name:** `research_paper_embeddings`
* **Distance Metric:** Cosine Similarity (`"metadata": {"hnsw:space": "cosine"}`)
* **Embedding Model:** Dense vector embedding (768-dim Google Gemini `models/text-embedding-004` or lightweight local fallback `all-MiniLM-L6-v2`).
* **Filtering Mechanism:** ChromaDB applies pre-filtering on indexed metadata before computing cosine distances across candidate vectors.

---

## 8. Inter-Service Communication & Streaming Protocols

### 8.1 API Gateway to Python Service Internal Contracts

All internal communication between the Node.js API Gateway and the Python FastAPI microservice is authenticated via an internal header:
* `Header: X-Internal-Service-Key = <GENAI_INTERNAL_SECRET>`

#### Endpoint Catalog (Python FastAPI)

| Method | Endpoint | Description | Request Body / Params | Response Format |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/internal/v1/health` | Health check & vector store liveness | None | `{"status": "ok", "chroma": true}` |
| `GET` | `/internal/v1/discovery/search` | Multi-source academic search | `q, sources, limit, offset` | `List[DiscoveredPaper]` |
| `POST` | `/internal/v1/ingest/start` | Start paper ingestion workflow | `{ userId, repoId, docId, source, downloadUrl }` | `{"jobId": "job_123"}` |
| `GET` | `/internal/v1/ingest/:jobId/stream` | SSE stream for ingestion progress | None (Job ID in path) | `text/event-stream` |
| `POST` | `/internal/v1/rag/stream` | Conversational RAG SSE generator | `{ userId, repoId, query, history: [...] }` | `text/event-stream` |

### 8.2 Server-Sent Events (SSE) Wire Format Specification

#### 1. Ingestion Progress Event Stream
Format emitted by `/internal/v1/ingest/:jobId/stream`:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Transfer-Encoding: chunked

event: progress
data: {"jobId":"job_123","step":"DOWNLOADING","percent":15,"message":"Fetching raw PDF from arXiv..."}

event: progress
data: {"jobId":"job_123","step":"OPTIMIZING","percent":40,"message":"Compressing object streams and linearizing with pikepdf..."}

event: progress
data: {"jobId":"job_123","step":"UPLOADING","percent":60,"message":"Storing optimized asset in Cloudinary..."}

event: progress
data: {"jobId":"job_123","step":"INDEXING","percent":85,"message":"Parsing pages and indexing vector embeddings in ChromaDB..."}

event: complete
data: {"jobId":"job_123","percent":100,"status":"INDEXED","documentId":"doc_4102b"}
```

#### 2. Conversational RAG Answer Stream
Format emitted by `/internal/v1/rag/stream`:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Transfer-Encoding: chunked

event: token
data: {"token":"The "}

event: token
data: {"token":"Transformer "}

event: token
data: {"token":"architecture "}

event: token
data: {"token":"relies "}

event: token
data: {"token":"on "}

event: token
data: {"token":"multi-head "}

event: token
data: {"token":"attention [Doc: Attention Is All You Need, Page: 5]."}

event: citations
data: {"citations":[{"citationId":"cite_01","docId":"doc_4102b","docTitle":"Attention Is All You Need","pageNumber":5,"snippet":"Multi-head attention allows the model to jointly attend to information from different representation subspaces..."}]}

event: done
data: {"finishReason":"stop","tokenCount":184}
```

---

## 9. Zero-Trust Security & Multi-Tenant Partitioning Model

Data isolation is enforced across four distinct system boundaries:

```mermaid
flowchart TD
    subgraph Layer1 ["Layer 1: Gateway Authorization"]
        L1_Check["Validate JWT + Verify Repository Ownership in PostgreSQL"]
    end

    subgraph Layer2 ["Layer 2: Internal Service Validation"]
        L2_Check["Validate X-Internal-Service-Key + Extract Tenant Context"]
    end

    subgraph Layer3 ["Layer 3: Vector Index Partitioning"]
        L3_Check["ChromaDB $and Compound Filter (user_id == uid, repository_id == rid)"]
    end

    subgraph Layer4 ["Layer 4: Storage Partitioning"]
        L4_Check["Cloudinary Signed URLs scoped to users/{user_id}/repos/{repo_id}/"]
    end

    Request[Client Request] --> L1_Check
    L1_Check -- Authorized --> L2_Check
    L1_Check -- Unauthorized --> Deny1[403 Forbidden]
    L2_Check --> L3_Check
    L2_Check --> L4_Check
    L3_Check --> IsolatedData[(Tenant Isolated Vector Chunks)]
    L4_Check --> IsolatedBlobs[(Tenant Isolated Cloudinary Files)]
```

### 9.1 Mathematical Proof of Vector Isolation
ChromaDB executes candidate filtering prior to vector similarity scoring:
$$\mathcal{S}_{\text{search}} = \{ c \in \mathcal{C} \mid c.\text{metadata}[\text{"user\_id"}] = u_{\text{auth}} \land c.\text{metadata}[\text{"repository\_id"}] = r_{\text{active}} \}$$
Even if two different users ingest the identical paper (e.g. *Attention Is All You Need*), chunks are stored with separate metadata tags. Neither user's query can surface or leak the other user's indexed data.

---

## 10. Repository Blueprint & Monorepo Directory Structure

The project is structured as a clear, clean polyglot monorepo:

```text
research-buddy/
├── Docs/                               # System documentation & specifications
│   ├── PROJECT_OVERVIEW.md             # Master project overview & plan
│   └── TECH_STACK_AND_ARCHITECTURE.md  # Detailed technical architecture (this document)
├── client/                             # Frontend Next.js 14 Application
│   ├── public/                         # Static assets (favicons, logos)
│   ├── src/
│   │   ├── app/                        # Next.js App Router pages & layouts
│   │   ├── components/                 # UI, Discovery, Chat, Reader components
│   │   ├── store/                      # Redux Toolkit store & slices
│   │   ├── lib/                        # Axios clients, SSE handlers, utilities
│   │   └── types/                      # TypeScript client interfaces
│   ├── tailwind.config.js              # Tailwind styling tokens & dark mode
│   ├── tsconfig.json                   # Client TypeScript configuration
│   └── package.json                    # Client dependencies
├── gateway/                            # Node.js / Express API Gateway
│   ├── prisma/
│   │   └── schema.prisma               # PostgreSQL schema definition
│   ├── src/
│   │   ├── controllers/                # Route handlers (auth, repos, docs, chats)
│   │   ├── middleware/                 # JWT guard, rate limiter, error handling
│   │   ├── routes/                     # Express router definitions
│   │   ├── services/                   # Business logic & Python service proxy
│   │   ├── utils/                      # Token generation, password hashing
│   │   └── index.ts                    # Gateway server entry point
│   ├── tsconfig.json                   # Gateway TypeScript configuration
│   └── package.json                    # Gateway dependencies
├── ai-service/                         # Python 3.10+ FastAPI GenAI Microservice
│   ├── app/
│   │   ├── api/v1/                     # API routers (discovery, ingest, rag)
│   │   ├── core/                       # App settings, logging, internal security
│   │   ├── services/
│   │   │   ├── discovery/              # arXiv, Semantic Scholar, PubMed, Wiki
│   │   │   ├── compression/            # pikepdf PDF optimizer & repair
│   │   │   ├── extraction/             # PyMuPDF text & page extractor
│   │   │   ├── chunking/               # Recursive semantic text splitter
│   │   │   ├── storage/                # Cloudinary upload integration
│   │   │   └── vector/                 # ChromaDB client & retriever
│   │   ├── models/                     # Pydantic schemas & event types
│   │   └── main.py                     # FastAPI entry point
│   ├── requirements.txt                # Python package dependencies
│   └── pyproject.toml                  # Python formatting & linting config
├── .env.example                        # Root environment variables blueprint
└── README.md                           # Repository orientation & quick start guide
```

---

## 11. Scalability Pathways & Production Readiness Checklist

### 11.1 Scalability Pathways

| Component | Current Architecture | Scale-Out Transition Path |
| :--- | :--- | :--- |
| **API Gateway** | Single Node.js instance | Horizontal scaling behind NGINX / Cloudflare load balancer; stateless JWT simplifies clustering. |
| **Relational Database** | Standalone PostgreSQL | PostgreSQL Primary-Replica with PgBouncer connection pooling. |
| **GenAI Microservice** | Async FastAPI with worker threads | Celery task queue with Redis broker for asynchronous ingestion tasks; multiple FastAPI worker nodes. |
| **Vector Database** | Embedded / Local ChromaDB | Dedicated ChromaDB cluster or enterprise Qdrant/Milvus cluster. |
| **Object Storage** | Cloudinary CDN | High-capacity Cloudinary enterprise tier or hybrid S3 backup. |

### 11.2 Environment Configuration Blueprint (`.env.example`)

```bash
# -----------------------------------------------------------------------------
# GLOBAL SYSTEM ENVIRONMENT VARIABLES
# -----------------------------------------------------------------------------
NODE_ENV=development
PORT_GATEWAY=5000
PORT_AI_SERVICE=8000
PORT_CLIENT=3000

# -----------------------------------------------------------------------------
# GATEWAY & AUTHENTICATION SECRETS
# -----------------------------------------------------------------------------
JWT_ACCESS_SECRET="super-secret-access-token-key-change-in-production"
JWT_REFRESH_SECRET="super-secret-refresh-token-key-change-in-production"
GENAI_INTERNAL_SECRET="shared-secret-between-gateway-and-fastapi"

# -----------------------------------------------------------------------------
# RELATIONAL DATABASE (POSTGRESQL)
# -----------------------------------------------------------------------------
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/research_buddy?schema=public"

# -----------------------------------------------------------------------------
# CLOUDINARY OBJECT STORAGE
# -----------------------------------------------------------------------------
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# -----------------------------------------------------------------------------
# GENAI / LLM & VECTOR CONFIGURATION (GOOGLE GEMINI)
# -----------------------------------------------------------------------------
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-1.5-pro"
GEMINI_EMBEDDING_MODEL="models/text-embedding-004"
CHROMA_PERSIST_DIRECTORY="./chroma_data"

# -----------------------------------------------------------------------------
# EXTERNAL ACADEMIC APIS (OPTIONAL API KEYS FOR HIGHER RATE LIMITS)
# -----------------------------------------------------------------------------
SEMANTIC_SCHOLAR_API_KEY=""
NCBI_PUBMED_API_KEY=""
```

---

## 12. Conclusion & Architectural Sign-off
This technical stack and architecture specification establishes the concrete technical design, service communication contracts, data models, and directory blueprints required to construct ResearchBuddy. All engineering implementation in subsequent phases must directly conform to this specification.
