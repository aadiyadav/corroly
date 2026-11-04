import asyncio
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse
from app.api.v1.dependencies import verify_internal_secret
from app.services.ingestion.ingestion_manager import ingestion_manager

router = APIRouter(prefix="/ingest", tags=["Document Ingestion"])


class IngestProcessRequest(BaseModel):
    jobId: str = Field(description="Unique ingestion job UUID")
    userId: str = Field(description="Tenant user UUID")
    repoId: str = Field(description="Repository workspace UUID")
    docId: str = Field(description="Document UUID")
    title: str = Field(description="Document title")
    downloadUrl: Optional[str] = Field(default=None, description="External PDF download URL")
    authors: Optional[List[str]] = Field(default_factory=list)


@router.post(
    "/process",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger asynchronous document ingestion pipeline"
)
async def process_document_ingestion(
    request: IngestProcessRequest,
    _: str = Depends(verify_internal_secret)
):
    """
    Initializes an ingestion job and launches the multi-stage background pipeline:
    downloading, pikepdf repair, pymupdf text parsing, semantic chunking, and ChromaDB vector indexing.
    """
    job = ingestion_manager.create_job(job_id=request.jobId, doc_id=request.docId)

    # Launch background ingestion pipeline
    asyncio.create_task(
        ingestion_manager.run_ingestion_pipeline(
            job_id=request.jobId,
            user_id=request.userId,
            repository_id=request.repoId,
            document_id=request.docId,
            document_title=request.title,
            download_url=request.downloadUrl
        )
    )

    return {
        "jobId": request.jobId,
        "docId": request.docId,
        "status": "PROCESSING",
        "message": "Ingestion job queued successfully."
    }


@router.post(
    "/upload",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload local PDF binary and trigger background ingestion"
)
async def upload_document_ingestion(
    file: UploadFile = File(...),
    jobId: str = Form(...),
    userId: str = Form(...),
    repoId: str = Form(...),
    docId: str = Form(...),
    title: str = Form(...),
    _: str = Depends(verify_internal_secret)
):
    """
    Receives raw PDF binary upload and triggers background parsing, chunking, and ChromaDB indexing.
    """
    pdf_bytes = await file.read()
    job = ingestion_manager.create_job(job_id=jobId, doc_id=docId)

    asyncio.create_task(
        ingestion_manager.run_ingestion_pipeline(
            job_id=jobId,
            user_id=userId,
            repository_id=repoId,
            document_id=docId,
            document_title=title,
            raw_pdf_bytes=pdf_bytes
        )
    )

    return {
        "jobId": jobId,
        "docId": docId,
        "status": "PROCESSING",
        "message": "Upload ingestion queued successfully."
    }


@router.get(
    "/jobs/{job_id}/stream",
    summary="Stream real-time ingestion progress events via SSE"
)
async def stream_ingestion_progress(
    job_id: str,
    _: str = Depends(verify_internal_secret)
):
    """
    Streams progress milestones (15%, 35%, 60%, 85%, 100%) and terminal events via Server-Sent Events.
    """
    job = ingestion_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingestion job '{job_id}' not found."
        )

    async def event_generator():
        while True:
            try:
                # Wait for next progress event with timeout
                event = await asyncio.wait_for(job.queue.get(), timeout=60.0)
                event_name = event.get("event", "progress")
                event_data = event.get("data", {})

                yield {
                    "event": event_name,
                    "data": json.dumps(event_data)
                }

                if event_name in ("done", "error"):
                    break
            except asyncio.TimeoutError:
                # Keep-alive heartbeat ping to prevent proxy drops
                yield {
                    "comment": "keepalive"
                }

    return EventSourceResponse(event_generator())


@router.get(
    "/documents/{doc_id}/file",
    summary="Stream local PDF binary fallback"
)
async def get_document_pdf_file(
    doc_id: str,
    _: str = Depends(verify_internal_secret)
):
    from fastapi.responses import FileResponse
    from app.services.storage.cloudinary_svc import storage_service

    pdf_path = storage_service.get_local_pdf_path(doc_id)
    if not pdf_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Local PDF binary for document '{doc_id}' not found."
        )
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{doc_id}.pdf",
        content_disposition_type="inline"
    )
