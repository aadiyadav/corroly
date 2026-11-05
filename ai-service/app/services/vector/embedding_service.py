import asyncio
from typing import List, Dict, Any, Optional
from pydantic import SecretStr
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.core.config import settings
from app.services.vector.chroma_client import vector_service


class EmbeddingService:
    """
    Orchestrates dense vector embedding generation and persistent multi-tenant ChromaDB storage.
    Supports Google Gemini embeddings (gemini-embedding-2) strictly matching the ChromaDB 3072-dimensional index.
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
        batch_size: int = 20
    ) -> int:
        """
        Embeds chunks in batches and persists them into ChromaDB under strict compound tenant isolation.
        Enforces 3072-dimensional consistency with exponential backoff retry.
        """
        if not chunks:
            return 0

        total_upserted = 0

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            texts = [c["text"] for c in batch]
            embeddings: Optional[List[List[float]]] = None

            if self.gemini_embeddings:
                for attempt in range(4):
                    try:
                        embeddings = await self.gemini_embeddings.aembed_documents(texts)
                        break
                    except Exception as e:
                        if attempt < 3:
                            wait_time = 2.0 * (attempt + 1)
                            print(f"[EmbeddingService] Gemini embedding attempt {attempt + 1} failed ({e}). Retrying in {wait_time}s...")
                            await asyncio.sleep(wait_time)
                        else:
                            raise RuntimeError(f"Gemini embedding generation failed after {attempt + 1} attempts: {e}")

            if not embeddings:
                raise ValueError("Embedding generation returned empty vectors. Cannot upsert without valid Gemini embeddings.")

            upserted = vector_service.upsert_document_chunks(
                user_id=user_id,
                repository_id=repository_id,
                document_id=document_id,
                document_title=document_title,
                chunks=batch,
                embeddings=embeddings
            )
            total_upserted += upserted

            # Slight delay between batches to respect Gemini rate limits
            if i + batch_size < len(chunks):
                await asyncio.sleep(0.5)

        return total_upserted


embedding_service = EmbeddingService()
