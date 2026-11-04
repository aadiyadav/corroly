# Research Paper Synthesizer (ResearchBuddy)
## Future Ideas, Production Deployment & Scale-Out Architecture

*Document Identifier:* `FUTURE-SPEC-007`  
*Version:* `1.0.0`  
*Status:* Backlog / Post-MVP Planning  
*Scope:* Production Containerization, Worker Topologies, Persistent Storage, Event Loop Offloading, and Advanced Research Capabilities  

---

## Table of Contents
1. [Overview & Purpose](#1-overview--purpose)
2. [GenAI Microservice Production Containerization (Docker)](#2-genai-microservice-production-containerization-docker)
3. [Process Architecture: Gunicorn + Uvicorn Async Workers](#3-process-architecture-gunicorn--uvicorn-async-workers)
4. [Event Loop CPU Offloading Strategy](#4-event-loop-cpu-offloading-strategy)
5. [Private VPC & Zero-Trust Network Topology](#5-private-vpc--zero-trust-network-topology)
6. [ChromaDB Cloud Volume Persistence & Scale-Out Paths](#6-chromadb-cloud-volume-persistence--scale-out-paths)
7. [Advanced Feature Backlog (Post-MVP)](#7-advanced-feature-backlog-post-mvp)

---

## 1. Overview & Purpose

This document catalogs architectural and operational considerations reserved for the **production deployment and post-MVP scaling phases**. During initial development, the system runs locally with decoupled runtimes (Node.js server, Python venv, Next.js dev server). When transitioning to staging and production, the patterns documented here will be implemented.

---

## 2. GenAI Microservice Production Containerization (Docker)

The GenAI microservice (`ai-service`) relies on underlying C++ shared libraries:
* `pikepdf` compiles against C++ `qpdf`.
* `PyMuPDF` compiles against C++ `MuPDF`.

To prevent host OS dependency drift and ensure deterministic execution across cloud platforms (AWS ECS, GCP Cloud Run, Kubernetes), the service will use a **Multi-Stage Dockerfile**:

```dockerfile
# =============================================================================
# PRODUCTION DOCKERFILE FOR AI-SERVICE (Multi-Stage Build)
# =============================================================================
# Stage 1: Build & Compile C++ Dependencies
FROM python:3.11-slim as builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    qpdf \
    libqpdf-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Minimal Secure Runtime Image
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libqpdf29 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /install /usr/local
COPY . .

# Run as non-privileged system user for container security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Gunicorn master process manager with Uvicorn async workers
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120"]
```

---

## 3. Process Architecture: Gunicorn + Uvicorn Async Workers

In production environments, running a single `uvicorn` development process is insufficient for enterprise workloads.

### Production Process Topology:
* **Master Process:** Gunicorn monitors worker health, handles graceful restarts, and auto-replaces crashed workers.
* **Worker Execution:** 4 to 8 Uvicorn async workers run in parallel ($2 \times \text{CPUs} + 1$).
* **Extended Timeout (`--timeout 120`):** Prevents premature termination of workers processing dense, 50-page academic papers.
* **Failure Isolation:** An out-of-memory error triggered by a malformed PDF terminates only that individual worker without dropping concurrent user chat streams.

---

## 4. Event Loop CPU Offloading Strategy

FastAPI's event loop is single-threaded per worker. While network I/O (`httpx`, SSE streaming) is asynchronous, CPU-intensive operations can block the event loop:
1. `pikepdf` stream compression and linearization.
2. `PyMuPDF` page text extraction and geometry calculations.
3. Recursive character text chunking.

### Future Implementation: ThreadPool Offloading
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Dedicated worker pool for C++ and CPU-heavy PDF tasks
cpu_pool = ThreadPoolExecutor(max_workers=4)

async def offload_cpu_task(sync_func, *args):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(cpu_pool, sync_func, *args)
```
* **Long-term Scale:** For sustained multi-tenant ingestions, transition heavy jobs to a dedicated **Celery + Redis worker queue**.

---

## 5. Private VPC & Zero-Trust Network Topology

In production cloud environments:
* **The `ai-service` must never have a public IP or DNS record.**
* Deployed in an isolated private subnet. Only the Node.js `server` application can communicate with port `8000`.
* Enforces `X-Internal-Service-Key` verification on all incoming requests.

```
[Internet Users] 
       │ (HTTPS)
       ▼
┌──────────────────┐
│  Next.js Client  │
└────────┬─────────┘
         │ (Public HTTPS :5000)
         ▼
┌──────────────────────────────────────┐
│  Node.js Server (Auth & Relational)  │
└────────┬─────────────────────────────┘
         │ (Private Internal Network / Port 8000)
         │ Header: X-Internal-Service-Key
         ▼
┌──────────────────────────────────────┐
│  FastAPI GenAI Service (Private VPC) │
│  - pikepdf / PyMuPDF / ChromaDB      │
└──────────────────────────────────────┘
```

---

## 6. ChromaDB Cloud Volume Persistence & Scale-Out Paths

* **Staging / Small Production:** ChromaDB runs in embedded persistent client mode, storing vectors on a **cloud persistent volume** (AWS EBS, GCP Persistent Disk, or DigitalOcean Block Storage) mounted at `/app/chroma_data`.
* **Scale-Out Path ($> 10\text{M}$ vectors):**
  * Deploy ChromaDB in standalone Client/Server mode as an independent microservice container.
  * Alternatively, transition vector queries to an enterprise distributed vector database (**Qdrant** or **Milvus**) using identical LangChain abstraction layers.

---

## 7. Advanced Feature Backlog (Post-MVP)

1. **Optical Character Recognition (OCR) Fallback:**
   * Integrate Tesseract / PaddleOCR for legacy scanned PDFs that lack a native text layer.
2. **Citation Graph Exploration:**
   * Visual interactive citation graphs mapping how ingested papers reference each other (using D3.js or React Flow).
3. **Cross-Paper Matrix Synthesis:**
   * Multi-paper comparison tables (e.g. comparing model size, dataset, accuracy across 5 papers in a repository).
4. **Export to BibTeX / Zotero:**
   * One-click citation export formatted for academic LaTeX manuscripts.
