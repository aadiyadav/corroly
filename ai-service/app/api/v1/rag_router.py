import json
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse
from app.api.v1.dependencies import verify_internal_secret
from app.services.rag.rag_service import rag_service

router = APIRouter(prefix="/rag", tags=["Conversational RAG"])


class RagStreamRequest(BaseModel):
    userId: str = Field(description="Tenant user UUID")
    repoId: str = Field(description="Repository workspace UUID")
    prompt: str = Field(min_length=1, max_length=4000, description="User prompt or question")
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Prior conversation messages")
    topK: Optional[int] = Field(default=5, ge=1, le=20, description="Top K vector chunks to retrieve")
    documentIds: Optional[List[str]] = Field(default=None, description="Targeted subset of document UUIDs for filtering")


@router.post(
    "/stream",
    summary="Stream grounded RAG tokens and citations via Server-Sent Events"
)
async def stream_rag_conversation(
    request: RagStreamRequest,
    _: str = Depends(verify_internal_secret)
):
    """
    Executes compound zero-trust ChromaDB retrieval, constructs anti-hallucination prompt,
    and streams LLM tokens followed by structured citation entities.
    """
    async def sse_stream():
        async for item in rag_service.stream_rag(
            user_id=request.userId,
            repository_id=request.repoId,
            prompt=request.prompt,
            history=request.history,
            top_k=request.topK or 5,
            document_ids=request.documentIds
        ):
            event_type = item["type"]
            event_data = item["data"]

            yield {
                "event": event_type,
                "data": json.dumps(event_data)
            }

    return EventSourceResponse(sse_stream(), ping=15)
