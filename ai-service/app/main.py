from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings

app = FastAPI(
    title="Corroly GenAI Microservice",
    description="Dedicated microservice for academic paper ingestion, pikepdf compression, PyMuPDF parsing, ChromaDB vector indexing, and grounded RAG streaming.",
    version="1.0.0"
)

# CORS Middleware (Internal service, allows local development access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1 import api_v1_router
app.include_router(api_v1_router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "research-buddy-ai-service",
        "environment": settings.ENVIRONMENT,
        "chroma_dir": settings.CHROMA_PERSIST_DIRECTORY
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Corroly GenAI Microservice API",
        "docs_url": "/docs",
        "health_url": "/health"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_GENAI_ERROR",
                "message": str(exc)
            }
        }
    )
