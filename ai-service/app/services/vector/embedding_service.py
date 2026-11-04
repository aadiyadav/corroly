from typing import List, Dict, Any, Optional
from pydantic import SecretStr
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.core.config import settings
from app.services.vector.chroma_client import vector_service


class EmbeddingService:
    """
    Orchestrates dense vector embedding generation and persistent multi-tenant ChromaDB storage.
    Supports Google Gemini embeddings (text-embedding-004) with fallback to ChromaDB's built-in vectorization.
    """

    def __init__(self):
        self.gemini_embeddings: Optional[GoogleGenerativeAIEmbeddings] = None
        if settings.GEMINI_API_KEY:
            import os
            os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
            self.gemini_embeddings = GoogleGenerativeAIEmbeddings(
                model=settings.GEMINI_EMBEDDING_MODEL
            )

    def embed_query(self, query: str) -> Optional[List[float]]:
        """
        Embeds a single query string to match ChromaDB 3072-dimensional index.
        """
        if self.gemini_embeddings:
            try:
                return self.gemini_embeddings.embed_query(query)
            except Exception as e:
                print(f"[EmbeddingService] Query embedding generation failed ({e})")
        return None


    async def embed_and_upsert_document(
        self,
        user_id: str,
        repository_id: str,
        document_id: str,
        document_title: str,
        chunks: List[Dict[str, Any]],
        batch_size: int = 50
    ) -> int:
        """
        Embeds chunks in batches and persists them into ChromaDB under strict compound tenant isolation.
        """
        if not chunks:
            return 0

        total_upserted = 0

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            texts = [c["text"] for c in batch]
            embeddings: Optional[List[List[float]]] = None

            if self.gemini_embeddings:
                try:
                    embeddings = await self.gemini_embeddings.aembed_documents(texts)
                except Exception as e:
                    # Log and fallback to ChromaDB's native onnx embedding
                    print(f"[EmbeddingService] Gemini embedding failed ({e}), falling back to ChromaDB default.")
                    embeddings = None

            upserted = vector_service.upsert_document_chunks(
                user_id=user_id,
                repository_id=repository_id,
                document_id=document_id,
                document_title=document_title,
                chunks=batch,
                embeddings=embeddings
            )
            total_upserted += upserted
        return total_upserted


embedding_service = EmbeddingService()
