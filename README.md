# Corroly (ResearchBuddy)

> **Enterprise-grade Academic Literature Discovery, Lossless PDF Study & Grounded Research Synthesis Platform**

🌐 **Live Application:** [https://corroly.vercel.app](https://corroly.vercel.app)

---

## 📌 Purpose

Generic LLMs frequently fail researchers through fact fabrication, non-existent bibliographic citations, and the loss of structural reading order across complex multi-column academic PDFs. 

**Corroly** bridges this gap by providing an end-to-end grounded **Retrieval-Augmented Generation (RAG)** workspace. It enables students, researchers, and engineers to federate searches across open-access literature, import or upload papers, view PDFs side-by-side with an AI research partner, and synthesize cross-paper findings with verifiable, page-level citation badges under strict zero-trust tenant isolation.

---

## 📸 Screenshots

| 1. Split Workspace (PDF Reader & Grounded RAG Chat) |
| :---: |
| ![Split View](images/1.png) |

| 2. Repositories & Workspaces Dashboard |
| :---: |
| ![Repositories Overview](images/2.png) |

| 3. Federated Academic Paper Discovery (arXiv, PubMed, Wikipedia) |
| :---: |
| ![Paper Discovery](images/3.png) |

---

## ⚡ Main Features

### 1. Federated Multi-Source Paper Discovery
* **Unified Academic Search:** Concurrently queries **arXiv**, **PubMed (NCBI Entrez)**, and **Wikipedia** in parallel using asynchronous worker tasks.
* **Smart Deduplication & Relevance Ranking:** Cleanses, deduplicates, and ranks papers by citation counts, publication year, and direct open-access PDF availability.
* **One-Click Ingestion:** Imports open-access papers straight into the active repository workspace.

### 2. Resilient 5-Stage Ingestion Pipeline
* **Stage 1 (SSRF Guard & Fetch):** Downloads the raw binary stream with strict hostname whitelisting and link-local/private IP protections.
* **Stage 2 (PikePDF Repair & Linearization):** Repairs damaged PDF cross-reference (`xref`) tables and linearizes the binary for fast progressive streaming, saving 30–50% in storage size.
* **Stage 3 (PyMuPDF Layout-Aware Parsing):** Extracts text blocks in natural reading order while tracking page boundaries and metadata.
* **Stage 4 (Semantic Chunking & 3072-dim Embedding):** Splits documents into page-bounded chunks and computes dense 3072-dimensional embeddings via Google's `gemini-embedding-2`. Features concurrency locks and exponential quota backoffs.
* **Stage 5 (Cloud Storage & SSE Completion):** Uploads compressed assets to Cloudinary (with local fallback) and notifies the client via Server-Sent Events.

### 3. Zero-Trust Multi-Tenant RAG
* **Strict Tenant Isolation:** Every query, upsert, and deletion in ChromaDB is mathematically partitioned with compound metadata filters:
  ```json
  {
    "$and": [
      { "user_id": { "$eq": "<user_uuid>" } },
      { "repository_id": { "$eq": "<repo_uuid>" } },
      { "document_id": { "$in": ["<selected_doc_ids>"] } }
    ]
  }
  ```
* **Multi-Paper Selection:** Toggle any combination of indexed papers in the sidebar to dynamically focus the conversational context.

### 4. Split-Screen Lossless PDF Reader
* High-performance in-browser rendering via `react-pdf` and `pdfjs-dist`.
* Direct page navigation, zoom controls, and responsive 3-tier mobile/tablet/desktop layouts.
* Clicking citation tags in the chat instantly synchronizes the viewer to the exact referenced page.

### 5. Live Token Streaming & Provenance Badges
* Low-latency **Server-Sent Events (SSE)** piping tokens from the AI microservice through Express to Next.js.
* Real-time answer synthesis with verifiable citation chips (`[Doc: <Title>, Page: <P>]`).
* Anti-hallucination system prompt ensuring the assistant strictly confines its analysis to the provided literature context.

### 6. Resilient Cross-Origin Authentication
* Dual-token authentication (short-lived JWT Access Token + long-lived Refresh Token).
* Cross-site `SameSite=None; Secure` cookie policy with a redundant `localStorage` fallback to preserve authenticated sessions across browser reloads without dropping state.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**, **Redux Toolkit**, **React-PDF** (`pdfjs-dist`), **Lucide Icons** |
| **API Gateway / Backend** | **Node.js**, **Express.js**, **TypeScript**, **Prisma ORM**, **PostgreSQL**, **Zod**, **Helmet**, **Cookie-Parser** |
| **AI / Microservice** | **Python 3.11**, **FastAPI**, **ChromaDB** (Vector Store), **Google Gemini API** (`gemini-3.5-flash`, `gemini-embedding-2`), **PyMuPDF**, **PikePDF**, **LangChain** |
| **Hosting & Cloud** | **Vercel** (Frontend Client), **Railway** (API Gateway, Python AI Service, ChromaDB Persistent Volume), **Cloudinary** (Blob Storage) |

---

## 🏗️ System Architecture

```
                       ┌────────────────────────┐
                       │  Next.js 14 Frontend   │
                       │ (https://corroly.vercel)│
                       └───────────┬────────────┘
                                   │ REST & SSE Streams
                                   │ (Bearer Token / Cookie)
                       ┌───────────▼────────────┐
                       │  Express API Gateway   │
                       │ (Auth, Prisma, Routes) │
                       └─────┬────────────▲─────┘
                             │            │
         Service-to-Service  │            │ Internal SSE
         Internal Secret Key │            │ Stream Pipe
                             │            │
                       ┌─────▼────────────┴─────┐
                       │ Python FastAPI Service │
                       │ (PyMuPDF, PikePDF, RAG)│
                       └─────┬────────────┬─────┘
                             │            │
          3072-dim Vectors   │            │ Dense Embeddings
                             │            │ & Generation
                       ┌─────▼─────┐┌─────▼─────────┐
                       │ ChromaDB  ││ Google Gemini │
                       │ (Volume)  ││   3.5 Flash   │
                       └───────────┘└───────────────┘
```

---

## 📂 Project Structure

```
research-buddy/
├── client/                      # Next.js 14 Frontend Client
│   ├── public/                  # Static assets & PDF.js worker
│   └── src/
│       ├── app/                 # Next.js App Router pages (Landing, Login, Workspaces)
│       ├── components/          # React components (Chat, Reader, Discovery, Sidebar)
│       ├── lib/                 # Axios API client & token utilities
│       └── store/               # Redux Toolkit slices (Auth, Workspace, Ingestion)
│
├── server/                      # Node.js Express API Gateway
│   ├── prisma/                  # Prisma schema & PostgreSQL migrations
│   └── src/
│       ├── controllers/         # Request controllers (Auth, Documents, Repos, Chat)
│       ├── middleware/          # AuthGuard, SSRF guard, rate limiter, error handlers
│       ├── routes/              # Express API route modules
│       ├── services/            # Database transactions & AI client dispatchers
│       └── index.ts             # Gateway entrypoint & CORS configuration
│
├── ai-service/                  # Python 3.11 FastAPI Microservice
│   ├── app/
│   │   ├── api/v1/              # Endpoints (Ingest, Discovery, RAG streaming)
│   │   ├── core/                # Settings & environment configuration
│   │   └── services/
│   │       ├── chunking/        # Page-bounded semantic text splitting
│   │       ├── compression/     # PikePDF repair & linearization
│   │       ├── discovery/       # arXiv, PubMed, Wikipedia scrapers & aggregator
│   │       ├── extraction/      # PyMuPDF reading-order extraction
│   │       ├── rag/             # Grounded prompt synthesis & citation parser
│   │       └── vector/          # ChromaDB client & Gemini embedding service
│   ├── Dockerfile               # Container spec with qpdf & libmupdf
│   └── requirements.txt         # Python dependencies
│
└── images/                      # Readme screenshots (1.jpg, 2.jpg, 3.jpg)
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
* **Node.js** >= 18.x
* **Python** >= 3.11
* **PostgreSQL** instance
* **Google Gemini API Key**

### 2. Environment Configuration

#### `server/.env`
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/corroly?schema=public"
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
AI_SERVICE_URL="http://localhost:8000"
GENAI_INTERNAL_SECRET="your-shared-internal-secret"
CLIENT_ORIGIN="http://localhost:3000"
```

#### `ai-service/.env`
```env
PORT=8000
HOST="0.0.0.0"
GENAI_INTERNAL_SECRET="your-shared-internal-secret"
GEMINI_API_KEY="your-google-gemini-key"
GEMINI_MODEL="gemini-3.5-flash"
GEMINI_EMBEDDING_MODEL="gemini-embedding-2"
CHROMA_PERSIST_DIRECTORY="./chroma_data"
CHROMA_COLLECTION_NAME="research_paper_embeddings_v2"
```

#### `client/.env`
```env
PORT=3000
NEXT_API_URL="http://localhost:5000/api/v1"
```

### 3. Running Locally

```bash
# Terminal 1: Database & Express Server
cd server
npm install
npx prisma migrate dev
npm run dev

# Terminal 2: Python AI Service
cd ai-service
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: Next.js Client
cd client
npm install
npm run dev
```

Visit `http://localhost:3000` to access Corroly locally.

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).

