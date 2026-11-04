from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from app.api.v1.dependencies import verify_internal_secret
from app.services.vector.chroma_client import vector_service
from app.services.storage.cloudinary_svc import storage_service

router = APIRouter(prefix="/cleanup", tags=["Cleanup & Maintenance"])


class PurgeDocumentRequest(BaseModel):
    userId: str = Field(description="Tenant user UUID")
    repoId: str = Field(description="Repository workspace UUID")
    docId: str = Field(description="Document UUID")
    cloudinaryPublicId: Optional[str] = Field(default=None)


class PurgeRepositoryRequest(BaseModel):
    userId: str = Field(description="Tenant user UUID")
    repoId: str = Field(description="Repository workspace UUID")
    publicIds: Optional[List[str]] = Field(default_factory=list)


@router.post("/document", summary="Purge document chunks from ChromaDB and PDF binary from Cloudinary")
async def purge_document(
    request: PurgeDocumentRequest,
    _: str = Depends(verify_internal_secret)
):
    vector_service.delete_document_chunks(
        user_id=request.userId,
        repository_id=request.repoId,
        document_id=request.docId
    )

    storage_res = {}
    if request.cloudinaryPublicId:
        storage_res = storage_service.delete_pdf_asset(request.cloudinaryPublicId)

    return {
        "purged": True,
        "docId": request.docId,
        "storage": storage_res
    }


@router.post("/repository", summary="Purge entire repository vector space and Cloudinary assets")
async def purge_repository(
    request: PurgeRepositoryRequest,
    _: str = Depends(verify_internal_secret)
):
    vector_service.delete_repository_chunks(
        user_id=request.userId,
        repository_id=request.repoId
    )

    storage_res = storage_service.delete_repository_assets(
        user_id=request.userId,
        repo_id=request.repoId
    )

    return {
        "purged": True,
        "repoId": request.repoId,
        "storage": storage_res
    }

