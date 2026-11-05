import asyncio
from typing import Dict, Any, Optional
import httpx
from app.services.compression.pike_optimizer import pdf_optimizer
from app.services.extraction.mupdf_extractor import pdf_extractor
from app.services.chunking.text_splitter import page_splitter
from app.services.vector.embedding_service import embedding_service
from app.services.storage.cloudinary_svc import storage_service


class IngestionJob:
    def __init__(self, job_id: str, doc_id: str):
        self.job_id = job_id
        self.doc_id = doc_id
        self.status = "PENDING"
        self.progress = 0
        self.queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None


class IngestionPipelineManager:
    """
    Orchestrates the asynchronous multi-stage ingestion finite state machine:
    1. HTTP PDF Stream Download (15%)
    2. PikePDF Structural Repair & Linearization (35%)
    3. PyMuPDF Reading-Order Text Extraction (60%)
    4. Deterministic Page-Bounded Chunking & Vector Indexing (85%)
    5. Final Completion & Metrics Emitted (100%)
    """

    def __init__(self):
        self.jobs: Dict[str, IngestionJob] = {}

    def create_job(self, job_id: str, doc_id: str) -> IngestionJob:
        job = IngestionJob(job_id=job_id, doc_id=doc_id)
        self.jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[IngestionJob]:
        return self.jobs.get(job_id)

    async def run_ingestion_pipeline(
        self,
        job_id: str,
        user_id: str,
        repository_id: str,
        document_id: str,
        document_title: str,
        download_url: Optional[str] = None,
        raw_pdf_bytes: Optional[bytes] = None
    ) -> None:
        job = self.jobs.get(job_id)
        if not job:
            return

        try:
            job.status = "PROCESSING"
            
            # --- Stage 1: Download or Retrieve PDF (15%) ---
            await job.queue.put({
                "event": "progress",
                "data": {"stage": "DOWNLOADING", "percent": 15, "message": "Fetching PDF binary stream..."}
            })

            pdf_bytes = raw_pdf_bytes
            if not pdf_bytes and download_url:
                async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                    resp = await client.get(
                        download_url,
                        headers={
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                            "Accept": "application/pdf,application/octet-stream,*/*",
                        }
                    )
                    resp.raise_for_status()
                    pdf_bytes = resp.content

            if not pdf_bytes:
                raise ValueError("No PDF bytes provided or download returned empty buffer.")

            if not pdf_bytes.startswith(b"%PDF"):
                raise ValueError("Downloaded content is not a valid PDF file. Direct PDF download is not supported for this URL.")

            raw_size = len(pdf_bytes)

            # --- Stage 2: PikePDF Repair & Linearization (35%) ---
            await job.queue.put({
                "event": "progress",
                "data": {"stage": "OPTIMIZING", "percent": 35, "message": "Repairing xref tables & linearizing..."}
            })

            optimized_bytes, comp_stats = pdf_optimizer.optimize_pdf_bytes(pdf_bytes)
            page_count = comp_stats["page_count"]
            comp_size = comp_stats["compressed_size_bytes"]

            # --- Stage 3: PyMuPDF Text Extraction (60%) ---
            await job.queue.put({
                "event": "progress",
                "data": {"stage": "EXTRACTING", "percent": 60, "message": f"Extracting text across {page_count} pages..."}
            })

            extracted_pages, extract_meta = pdf_extractor.extract_pages(optimized_bytes)

            # --- Stage 4: Page-Bounded Chunking & Vector Indexing (85%) ---
            await job.queue.put({
                "event": "progress",
                "data": {"stage": "INDEXING", "percent": 85, "message": "Generating embeddings & indexing in ChromaDB..."}
            })

            chunks = page_splitter.split_pages(document_id=document_id, pages=extracted_pages)
            upserted_count = await embedding_service.embed_and_upsert_document(
                user_id=user_id,
                repository_id=repository_id,
                document_id=document_id,
                document_title=document_title,
                chunks=chunks
            )

            # --- Stage 5: Cloudinary Blob Storage & Completion (100%) ---
            upload_meta = storage_service.upload_pdf_stream(
                user_id=user_id,
                repo_id=repository_id,
                doc_id=document_id,
                pdf_bytes=optimized_bytes
            )

            result_data = {
                "document_id": document_id,
                "page_count": page_count,
                "file_size_bytes_raw": raw_size,
                "file_size_bytes_comp": comp_size,
                "saved_bytes": comp_stats["saved_bytes"],
                "reduction_percentage": comp_stats["reduction_percentage"],
                "total_chunks": upserted_count,
                "is_scanned": extract_meta.get("is_scanned", False),
                "cloudinary_url": upload_meta.get("secure_url"),
                "cloudinary_public_id": upload_meta.get("public_id")
            }

            job.status = "INDEXED"
            job.result = result_data

            await job.queue.put({
                "event": "progress",
                "data": {
                    "stage": "COMPLETED",
                    "percent": 100,
                    "message": "Document successfully indexed, grounded, and stored.",
                    "stats": {
                        "pageCount": page_count,
                        "fileSizeBytesRaw": raw_size,
                        "fileSizeBytesComp": comp_size,
                        "totalChunks": upserted_count,
                        "cloudinaryUrl": upload_meta.get("secure_url")
                    }
                }
            })
            await job.queue.put({"event": "done", "data": {"status": "INDEXED", "result": result_data}})


        except Exception as e:
            import traceback
            print(f"[Ingestion Error] Pipeline failed for doc {document_id}: {e}")
            traceback.print_exc()
            job.status = "FAILED"
            job.error = str(e)
            await job.queue.put({
                "event": "error",
                "data": {"stage": "FAILED", "percent": 0, "error": str(e)}
            })


ingestion_manager = IngestionPipelineManager()
