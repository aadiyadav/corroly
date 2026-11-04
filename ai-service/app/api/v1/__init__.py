from fastapi import APIRouter
from app.api.v1.discovery_router import router as discovery_router
from app.api.v1.ingest_router import router as ingest_router
from app.api.v1.rag_router import router as rag_router
from app.api.v1.cleanup_router import router as cleanup_router

api_v1_router = APIRouter(prefix="/internal/v1")
api_v1_router.include_router(discovery_router)
api_v1_router.include_router(ingest_router)
api_v1_router.include_router(rag_router)
api_v1_router.include_router(cleanup_router)

__all__ = ["api_v1_router"]
