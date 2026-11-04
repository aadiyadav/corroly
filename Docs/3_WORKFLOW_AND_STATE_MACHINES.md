# Research Paper Synthesizer (ResearchBuddy)
## System Workflows, State Machines & Execution Lifecycle

*Document Identifier:* `WORKFLOW-SPEC-003`  
*Version:* `1.0.0`  
*Status:* Approved for Implementation  
*Scope:* Comprehensive System Workflows, Finite State Machines (FSMs), Event Triggers, Failure Recoveries, and Interaction Lifecycles  

---

## Table of Contents
1. [Workflow Architecture Overview](#1-workflow-architecture-overview)
2. [Document Ingestion & Processing Pipeline State Machine](#2-document-ingestion--processing-pipeline-state-machine)
3. [User Authentication & Session Lifecycle State Machine](#3-user-authentication--session-lifecycle-state-machine)
4. [Multi-Source Literature Discovery Workflow](#4-multi-source-literature-discovery-workflow)
5. [Conversational RAG & Grounded Synthesis State Machine](#5-conversational-rag--grounded-synthesis-state-machine)
6. [Interactive Split-Screen Reader & Citation Navigation Workflow](#6-interactive-split-screen-reader--citation-navigation-workflow)
7. [Repository Management & Cascade Deletion Workflow](#7-repository-management--cascade-deletion-workflow)
8. [Failure Recovery, Resiliency & Circuit Breakers](#8-failure-recovery-resiliency--circuit-breakers)

---

## 1. Workflow Architecture Overview

ResearchBuddy coordinates multiple asynchronous, stateful, and real-time operations across three service boundaries (Next.js Client, Node.js API Gateway, and Python FastAPI GenAI microservice). To maintain data consistency, multi-tenant isolation, and immediate user feedback, all operations follow deterministic **Finite State Machines (FSMs)**.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            CORE SYSTEM STATE MACHINES                            │
├──────────────────────┬──────────────────────┬────────────────────────────────────┤
│ 1. INGESTION FSM     │ 2. AUTHENTICATION    │ 3. CONVERSATIONAL RAG FSM          │
│ PENDING ──► OPTIMIZE │ UNAUTHENTICATED      │ IDLE ──► RETRIEVING ──► STREAMING  │
│    │           │     │       │              │             │              │       │
│    ▼           ▼     │       ▼              │             ▼              ▼       │
│ UPLOAD ───► INDEXED  │ AUTHENTICATED ──►RTR │      GROUNDED CITATIONS ──►STORED  │
└──────────────────────┴──────────────────────┴────────────────────────────────────┘
```

---

## 2. Document Ingestion & Processing Pipeline State Machine

The document ingestion pipeline coordinates PDF downloading, C++ structural repair and compression (`pikepdf`), cloud asset hosting (Cloudinary), text and layout extraction (PyMuPDF), semantic chunking, and vector indexing (ChromaDB).

### 2.1 Formal Finite State Machine (FSM)

```mermaid
stateDiagram-v2
    [*] --> DISCOVERED : Search Results Rendered

    DISCOVERED --> PENDING : User Triggers Ingestion (POST /repos/:id/ingest)
    
    state IngestionExecution {
        PENDING --> FETCHING_PDF : Worker Assigned / Download Kickoff
        FETCHING_PDF --> OPTIMIZING_PDF : Buffer Loaded into Memory
        OPTIMIZING_PDF --> UPLOADING_CLOUD : pikepdf Optimization & Repair Complete
        UPLOADING_CLOUD --> PARSING_TEXT : Cloudinary Asset Stored & URL Saved
        PARSING_TEXT --> CHUNKING_TEXT : PyMuPDF Extracted Page-Aware Text
        CHUNKING_TEXT --> GENERATING_EMBEDDINGS : Recursive Page-Bounded Chunks Ready
        GENERATING_EMBEDDINGS --> INDEXING_VECTORS : Embeddings Vectorized
        INDEXING_VECTORS --> INDEXED : ChromaDB Upsert & Metadata Tagged
    }

    state FailureRecovery {
        FETCHING_PDF --> FAILED : Network Timeout / 404 Not Found
        OPTIMIZING_PDF --> FAILED : Password Protected / Fatal PDF Corruption
        UPLOADING_CLOUD --> FAILED : Cloudinary Quota / Upload Error
        PARSING_TEXT --> FAILED : Empty Text (Scanned/OCR Needed)
        INDEXING_VECTORS --> FAILED : ChromaDB Connection Failure
    }

    INDEXED --> [*] : Document Ready for Chat & Reader
    FAILED --> PENDING : User Clicks "Retry Ingestion"
    FAILED --> [*] : User Removes Document from Queue
```

### 2.2 State Transition Matrix & Actions

| Current State | Event / Trigger | Target State | Internal Actions & Emitted SSE Event | Failure / Fallback Transition |
| :--- | :--- | :--- | :--- | :--- |
| `DISCOVERED` | User checks paper & selects repository | `PENDING` | Creates `Document` row in PostgreSQL with `status: PENDING`. Generates `jobId`. | N/A |
| `PENDING` | FastAPI ingestion task claimed | `FETCHING_PDF` | Stream SSE: `{ step: "FETCHING_PDF", percent: 15 }`. Downloads binary buffer from external URL. | If download fails $\to$ `FAILED` |
| `FETCHING_PDF` | Binary stream in memory | `OPTIMIZING_PDF` | Stream SSE: `{ step: "OPTIMIZING_PDF", percent: 35 }`. Invokes `pikepdf` engine: linearizes, deflates object streams, repairs broken xref tables. | If password-locked or non-repairable $\to$ `FAILED` |
| `OPTIMIZING_PDF`| Optimization buffer produced | `UPLOADING_CLOUD`| Stream SSE: `{ step: "UPLOADING_CLOUD", percent: 55 }`. Streams buffer to Cloudinary signed folder `users/{uid}/repos/{rid}/`. Updates PostgreSQL with `cloudinaryUrl`. | If upload fails $\to$ `FAILED` |
| `UPLOADING_CLOUD`| Cloudinary returns secure URL | `PARSING_TEXT` | Stream SSE: `{ step: "PARSING_TEXT", percent: 70 }`. Opens stream in PyMuPDF (`fitz`). Extracts text per page preserving geometry and column order. | If text $< 50$ chars total $\to$ `FAILED` (OCR required) |
| `PARSING_TEXT` | Page dictionary created | `CHUNKING_TEXT` | Stream SSE: `{ step: "CHUNKING_TEXT", percent: 80 }`. Splits pages via `RecursiveCharacterTextSplitter` (1000 char size, 200 overlap). Enforces chunk-to-page boundary constraints. | If 0 chunks produced $\to$ `FAILED` |
| `CHUNKING_TEXT`| Chunks array formed | `GENERATING_EMBEDDINGS` | Stream SSE: `{ step: "GENERATING_EMBEDDINGS", percent: 90 }`. Batch generates vector embeddings (dense vectors). | If embedding API errors out $\to$ `FAILED` |
| `GENERATING_EMBEDDINGS`| Dense vectors created | `INDEXING_VECTORS` | Stream SSE: `{ step: "INDEXING_VECTORS", percent: 95 }`. Inserts records into ChromaDB collection `research_paper_embeddings` with tenant metadata tags. | If Chroma write fails $\to$ `FAILED` |
| `INDEXING_VECTORS`| ChromaDB write confirmed | `INDEXED` | Stream SSE: `{ step: "COMPLETE", percent: 100, status: "INDEXED" }`. Sets PostgreSQL `status: INDEXED`. Ready for RAG. | N/A |
| Any State | Exception thrown | `FAILED` | Sets PostgreSQL `status: FAILED`, writes `errorMessage`. Emits SSE: `{ step: "FAILED", error: "..." }`. | Enables manual "Retry" action |

---

## 3. User Authentication & Session Lifecycle State Machine

ResearchBuddy implements stateless dual-token authentication (short-lived Access Tokens held in client memory, long-lived Refresh Tokens stored in secure `HttpOnly` browser cookies).

### 3.1 Session Lifecycle FSM

```mermaid
stateDiagram-v2
    [*] --> UNAUTHENTICATED

    UNAUTHENTICATED --> AUTHENTICATING : User submits login / register form
    AUTHENTICATING --> AUTHENTICATED : Valid credentials verified by API Gateway
    AUTHENTICATING --> UNAUTHENTICATED : Invalid credentials (401 Unauthorized)

    state AUTHENTICATED {
        [*] --> ACTIVE_TOKEN : Access Token (15 min) in Redux RAM
        ACTIVE_TOKEN --> TOKEN_EXPIRED : 15 Minutes Elapse
        
        TOKEN_EXPIRED --> REFRESHING_SESSION : Axios Interceptor catches 401 & calls /auth/refresh
        
        state REFRESHING_SESSION {
            [*] --> CHECK_DB_HASH
            CHECK_DB_HASH --> ROTATE_TOKEN : Token valid & active
            ROTATE_TOKEN --> [*] : Old token revoked, New Access & Refresh Token issued
        }

        REFRESHING_SESSION --> ACTIVE_TOKEN : New Access Token loaded into Redux RAM
    }

    AUTHENTICATED --> LOGGED_OUT : User clicks "Logout" (POST /auth/logout)
    LOGGED_OUT --> UNAUTHENTICATED : Cookie cleared & DB token revoked

    state SECURITY_BREACH {
        CHECK_DB_HASH --> THEFT_DETECTED : Inbound Token already revoked (Reuse attempt!)
        THEFT_DETECTED --> REVOKE_ALL_SESSIONS : Purge all Refresh Tokens for user
    }

    SECURITY_BREACH --> UNAUTHENTICATED : Force re-login with security alert
```

### 3.2 Client HTTP Interceptor & Silent Refresh Algorithm
To ensure zero friction when the 15-minute access token expires during active research:

```mermaid
sequenceDiagram
    autonumber
    actor User as Researcher
    participant UI as Next.js Client (Axios Client)
    participant Gateway as Node.js Gateway
    participant DB as PostgreSQL

    User->>UI: Action: Open Repository Workspace
    UI->>Gateway: GET /api/v1/repos/repo_123 (Authorization: Bearer <Expired_Token>)
    Gateway-->>UI: 401 Unauthorized (Error: "TOKEN_EXPIRED")

    note over UI: Axios Response Interceptor Triggers
    UI->>UI: Queue original request into retryQueue
    UI->>Gateway: POST /api/v1/auth/refresh (Browser sends HttpOnly refreshToken cookie)
    
    Gateway->>DB: Verify token_hash in refresh_tokens table
    alt Valid Active Token
        Gateway->>DB: Invalidate current token (is_revoked = true)
        Gateway->>DB: Insert new token hash
        Gateway-->>UI: Set-Cookie: newRefreshToken; Body: { accessToken: <New_Token> }
        UI->>UI: Update Redux state with new accessToken
        UI->>Gateway: Replay queued request with new accessToken
        Gateway-->>UI: 200 OK with Repository Data
        UI-->>User: Seamlessly renders workspace (No re-login prompt)
    else Token Revoked / Reused (Theft Anomaly)
        Gateway->>DB: Invalidate ALL refresh tokens for this user
        Gateway-->>UI: Clear-Cookie; 403 Forbidden ("SESSION_COMPROMISED")
        UI->>UI: Wipe Redux auth slice & redirect to /login
        UI-->>User: Prompt: "Your session was terminated for security. Please sign in again."
    end
```

---

## 4. Multi-Source Literature Discovery Workflow

This workflow enables cross-disciplinary literature search across arXiv, Semantic Scholar, PubMed, and Wikipedia without polluting the vector database.

### 4.1 Federated Discovery Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Researcher
    participant Modal as Discovery Modal UI
    participant Gateway as Node.js Gateway
    participant AI as FastAPI Discovery Service
    participant arXiv as arXiv API
    participant S2 as Semantic Scholar API
    participant PubMed as PubMed API
    participant Wiki as Wikipedia API

    User->>Modal: Enters query: "Sparse Mixture of Experts" + Selects Sources
    Modal->>Gateway: GET /api/v1/repos/:id/discovery/search?q=...&sources=arxiv,s2
    Gateway->>AI: Internal Proxy to /internal/v1/discovery/search

    par Parallel Federated Retrieval
        AI->>arXiv: Query ArxivLoader (CS, Math, Physics)
        AI->>S2: Query S2 Academic Graph API (238M+ Papers, Citations)
        opt If Selected
            AI->>PubMed: Query PubMedLoader (Life Sciences, Medicine)
            AI->>Wiki: Query WikipediaLoader (Jargon definitions)
        end
    end

    arXiv-->>AI: Raw arXiv payloads
    S2-->>AI: Raw S2 payloads with citation metrics
    PubMed-->>AI: Raw PubMed records
    Wiki-->>AI: Raw Wikipedia summaries

    note over AI: Normalization & Deduplication Engine
    AI->>AI: Extract canonical identifiers (DOI, arXiv ID, Title Hash)
    AI->>AI: Merge duplicate entries (Enrich arXiv papers with S2 citation counts)
    AI->>AI: Sort by Relevance / Citations

    AI-->>Gateway: Unified Normalized Paper List
    Gateway-->>Modal: Return Paginated Discovered Paper Cards
    Modal-->>User: Displays cards with Authors, Year, Abstract, Citation Count

    User->>Modal: Selects 2 papers -> Clicks "Ingest into Active Workspace"
    Modal->>Gateway: POST /api/v1/repos/:id/ingest { selectedPapers: [...] }
    Gateway->>Gateway: Check for duplicates in repository
    Gateway->>AI: Trigger Ingestion Pipeline FSM (Section 2)
```

---

## 5. Conversational RAG & Grounded Synthesis State Machine

This state machine governs user Q&A interactions, ensuring that responses stream in real time and strictly cite verified source pages from documents in the current repository.

### 5.1 Conversational RAG Execution FSM

```mermaid
stateDiagram-v2
    [*] --> CHAT_IDLE : Workspace Loaded

    CHAT_IDLE --> QUERY_VALIDATION : User types prompt & hits "Send"
    
    state QUERY_VALIDATION {
        [*] --> CHECK_INPUT_LENGTH
        CHECK_INPUT_LENGTH --> REJECT_EMPTY : Input empty
        CHECK_INPUT_LENGTH --> CHECK_ACTIVE_DOCS : Valid length
        CHECK_ACTIVE_DOCS --> REJECT_NO_DOCS : Repository has 0 indexed papers
        CHECK_ACTIVE_DOCS --> PROCEED_RAG : Papers exist in repository
    }

    REJECT_EMPTY --> CHAT_IDLE : Toast: "Please enter a question"
    REJECT_NO_DOCS --> CHAT_IDLE : Alert: "Please ingest at least one paper first"

    PROCEED_RAG --> RETRIEVING_CONTEXT : Open SSE Connection to /chats/:id/stream

    state RAG_PIPELINE {
        RETRIEVING_CONTEXT --> QUERY_VECTOR_STORE : Pass query + compound tenant filter
        QUERY_VECTOR_STORE --> RANKING_CHUNKS : ChromaDB returns Top-K candidates
        RANKING_CHUNKS --> FORMATTING_PROMPT : Select Top-5 chunks, format bracketed sources
        FORMATTING_PROMPT --> STREAMING_LLM : Dispatch prompt to LLM with Grounding Rules
        
        state STREAMING_LLM {
            [*] --> RECEIVE_TOKEN
            RECEIVE_TOKEN --> EMIT_SSE_TOKEN : Pipe token to client typewriter
            EMIT_SSE_TOKEN --> RECEIVE_TOKEN : More tokens incoming
            EMIT_SSE_TOKEN --> PARSE_CITATIONS : LLM stream concludes
        }

        PARSE_CITATIONS --> PERSISTING_MESSAGE : Extract [Doc: ..., Page: ...] tags
    }

    PERSISTING_MESSAGE --> CHAT_IDLE : Save Assistant Message & JSONB Citations to PostgreSQL
    
    state RAG_ERROR {
        RETRIEVING_CONTEXT --> ERROR_STATE : ChromaDB timeout
        STREAMING_LLM --> ERROR_STATE : LLM Provider API limit/error
    }

    ERROR_STATE --> CHAT_IDLE : Render error message with "Retry" button
```

### 5.2 Citation Grounding & Parsing Pipeline

```mermaid
flowchart TD
    UserQuery[User Asks: 'How does multi-head attention scale?'] --> FilteredRetrieval
    
    subgraph ZeroTrustRetrieval ["Zero-Trust ChromaDB Retrieval"]
        FilteredRetrieval["Query ChromaDB with Filter: user_id == uid AND repository_id == rid"]
        FilteredRetrieval --> TopChunks["Retrieve Top-K Chunks with Page Metadata"]
    end

    TopChunks --> PromptGen["Construct Prompt with Grounding Directive & Source Blocks"]
    PromptGen --> LLMStream["LLM Generates Answer via Streaming Callback"]

    subgraph StreamingAndParsing ["Real-Time SSE Streaming & Parser"]
        LLMStream --> EmitTokens["Emit SSE 'token' events to Next.js typewriter"]
        EmitTokens --> Accumulate["Accumulate full answer string"]
        Accumulate --> RegexParser["Scan answer for citation pattern: [Doc: Title, Page: N]"]
        RegexParser --> MatchSource["Verify cited Title & Page exist in retrieved chunks"]
    end

    MatchSource --> VerifiedPayload["Construct JSONB Citations Array: [{ docId, page, snippet }]"]
    VerifiedPayload --> EmitCitations["Emit SSE 'citations' event to Next.js"]
    EmitCitations --> Persist["Persist to PostgreSQL: ChatMessage with JSONB citations"]
```

---

## 6. Interactive Split-Screen Reader & Citation Navigation Workflow

ResearchBuddy features a synchronous connection between the conversational chat interface and the built-in PDF reader.

### 6.1 Split-Screen Interaction Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as Researcher
    participant ChatUI as Chat Console
    participant Store as Redux Toolkit Store
    participant Reader as Split-Pane PDF Viewer (react-pdf)
    participant Cloud as Cloudinary CDN

    User->>ChatUI: Inspects AI response containing citation: [Doc: Attention Is All You Need, Page: 4]
    ChatUI-->>User: Renders clickable interactive Citation Badge
    
    User->>ChatUI: Clicks Citation Badge Chip
    ChatUI->>Store: Dispatch openReaderWithCitation({ docId: "doc_4102b", page: 4, snippet: "..." })

    Store->>Store: Update UIState: isReaderOpen = true, activeReaderPage = 4
    Store->>Reader: Notify state update

    alt PDF Already Cached in Memory
        Reader->>Reader: Scroll canvas directly to Page 4
    else PDF Not Yet Loaded
        Reader->>Cloud: Fetch compressed PDF from Cloudinary URL (Fast Web View / Range Request)
        Cloud-->>Reader: Deliver Page 1-4 Byte Streams
        Reader->>Reader: Render Page 4 onto canvas viewport
    end

    Reader->>Reader: Highlight sentence matching citation snippet with yellow glow
    Reader-->>User: Page 4 displayed with source text highlighted
```

---

## 7. Repository Management & Cascade Deletion Workflow

When a user modifies or deletes a workspace repository, data integrity must be maintained across PostgreSQL, ChromaDB, and Cloudinary.

### 7.1 Cross-Storage Cascade Deletion Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as Researcher
    participant Gateway as Node.js Gateway
    participant PG as PostgreSQL (Prisma)
    participant AI as FastAPI GenAI Service
    participant Chroma as ChromaDB Vector Store
    participant Cloud as Cloudinary CDN

    User->>Gateway: DELETE /api/v1/repos/repo_x9f2a
    Gateway->>Gateway: Verify repository belongs to authenticated user
    Gateway->>PG: Query all Document records in repo_x9f2a
    PG-->>Gateway: Returns List of { docId, cloudinaryPublicId }

    rect rgb(255, 240, 240)
        note over Gateway,PG: Step 1: Relational Cascade
        Gateway->>PG: DELETE FROM repositories WHERE id = 'repo_x9f2a'
        note right of PG: Cascade deletes repository, documents, conversations, and messages atomically
    end

    rect rgb(240, 248, 255)
        note over Gateway,AI: Step 2: Distributed Storage Cleanup
        Gateway->>AI: POST /internal/v1/cleanup/repository { userId, repoId, publicIds }
    end

    par Parallel Distributed Deletion
        AI->>Chroma: collection.delete(where={"repository_id": "repo_x9f2a"})
        note over Chroma: All vector embeddings tagged with repo_x9f2a are purged
        AI->>Cloud: cloudinary.api.delete_resources_by_prefix("research_buddy/users/uid/repos/repo_x9f2a/")
        note over Cloud: All PDF binaries in workspace folder are permanently destroyed
    end

    AI-->>Gateway: 200 OK (Purge Confirmed)
    Gateway-->>User: 200 OK ("Repository and all associated data permanently erased")
```

---

## 8. Failure Recovery, Resiliency & Circuit Breakers

To deliver enterprise-grade reliability, the platform implements specific recovery paths for every potential point of failure:

| Failure Scenario | Detection Mechanism | Immediate System Response | User Experience & Recovery Path |
| :--- | :--- | :--- | :--- |
| **External Academic API Outage (e.g., Semantic Scholar 503)** | HTTP status code $\ge 500$ or timeout ($> 8\text{s}$) in FastAPI adapter | Retry $3\times$ with exponential backoff (`tenacity`). Fall back to remaining online sources (arXiv, PubMed). | Discovery modal displays warning badge: *"Semantic Scholar unavailable; showing results from arXiv and PubMed."* |
| **Corrupted or Malformed PDF Binary** | `pikepdf.PdfError` during parsing or xref rebuild | Catch exception in `pike_optimizer.py`. Attempt fallback parse via raw PyMuPDF without optimization. | If PyMuPDF also fails, mark document `FAILED` with message *"PDF structure unreadable or corrupted."* User prompted to upload alternate copy. |
| **Scanned Document (No Text Layer)** | PyMuPDF extracts $< 50$ characters across initial 3 pages | Detect empty string threshold in `mupdf_extractor.py`. Abort vector chunking. | Document marked `FAILED` with message *"Scanned document detected. Optical Character Recognition (OCR) required."* |
| **Client Disconnection during Ingestion SSE** | Browser tab closed or network dropped mid-ingestion | Ingestion task continues execution in background on FastAPI server; progress updates commit to PostgreSQL. | When user re-opens workspace, client queries `GET /api/v1/repos/:id/documents` and sees document in its updated `INDEXED` state. |
| **Client Disconnection during RAG Token Stream** | Abrupt client TCP termination | Gateway detects closed socket and cancels internal stream to FastAPI; FastAPI cancels LLM stream. | Incomplete answer discarded; user can re-submit question upon reconnection. |
| **ChromaDB Connection Drop** | Vector store query timeout ($> 3000\text{ms}$) | Catch connection exception in `chroma_client.py`. Log critical alert. | Gateway emits SSE event: `event: error { message: "Search index temporarily unavailable. Please try again shortly." }`. |

---

## 9. Conclusion & Implementation Sign-off
This document defines the behavioral and state mechanics for ResearchBuddy. All client components (Redux reducers, UI hooks, reader controls), API Gateway controllers, and FastAPI microservice handlers must conform to the state transitions, payloads, and recovery pathways established in this specification.
