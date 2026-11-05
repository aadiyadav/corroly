import asyncio
import re
from typing import List, Dict, Any, Optional
from pydantic import SecretStr
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.core.config import settings
from app.services.vector.chroma_client import vector_service

# Global concurrency lock to serialize embedding generation across parallel document imports
_embedding_lock = asyncio.Lock()


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
        batch_size: int = 15
    ) -> int:
        """
        Embeds chunks in batches and persists them into ChromaDB under strict compound tenant isolation.
        Uses global locking and intelligent 429 quota backoff to guarantee rate-limit safety.
        """
        if not chunks:
            return 0

        async with _embedding_lock:
            total_upserted = 0

            for i in range(0, len(chunks), batch_size):
                batch = chunks[i:i + batch_size]
                texts = [c["text"] for c in batch]
                embeddings: Optional[List[List[float]]] = None

                if self.gemini_embeddings:
                    for attempt in range(6):
                        try:
                            embeddings = await self.gemini_embeddings.aembed_documents(texts)
                            break
                        except Exception as e:
                            err_str = str(e)
                            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                                # Extract exact required wait time from Google's response or default to 32s
                                match = re.search(r"retry in (\d+(?:\.\d+)?)s", err_str, re.IGNORECASE)
                                delay_sec = float(match.group(1)) + 1.5 if match else 32.0
                                print(f"[EmbeddingService] Gemini rate limit hit (429). Waiting {delay_sec:.1f}s before retry (attempt {attempt + 1}/6)...")
                                await asyncio.sleep(delay_sec)
                            elif attempt < 5:
                                wait_time = 3.0 * (attempt + 1)
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

                # Paced inter-batch delay to stay under Free Tier 100 requests-per-minute
                if i + batch_size < len(chunks):
                    await asyncio.sleep(0.75)

            return total_upserted


embedding_service = EmbeddingService()
