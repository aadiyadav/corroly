import os
from typing import List, Dict, Any, Optional, cast
import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.api.types import Where
from app.core.config import settings


class ChromaVectorService:
    """
    Production-ready ChromaDB client wrapper enforcing zero-trust multi-tenant isolation.
    Every query, upsert, and deletion is partitioned strictly by (user_id, repository_id).
    """

    def __init__(self):
        self.persist_directory = os.path.abspath(settings.CHROMA_PERSIST_DIRECTORY)
        os.makedirs(self.persist_directory, exist_ok=True)
        
        self.client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        self.collection_name = settings.CHROMA_COLLECTION_NAME
        self.collection = self._get_or_create_collection()

    def _get_or_create_collection(self):
        """
        Initializes or connects to the primary vector collection using cosine similarity.
        """
        return self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    @staticmethod
    def build_tenant_filter(
        user_id: str,
        repository_id: str,
        document_ids: Optional[List[str]] = None
    ) -> Where:
        """
        Constructs the immutable zero-trust compound filter.
        Mathematically isolates vector search results to the authenticated user, active workspace,
        and optionally a targeted subset of document IDs.
        """
        filter_conditions: List[Dict[str, Any]] = [
            {"user_id": {"$eq": str(user_id)}},
            {"repository_id": {"$eq": str(repository_id)}}
        ]

        if document_ids is not None:
            if len(document_ids) == 0:
                filter_conditions.append({"document_id": {"$eq": "__EXCLUDE_ALL_DOCUMENTS__"}})
            elif len(document_ids) == 1:
                filter_conditions.append({"document_id": {"$eq": str(document_ids[0])}})
            else:
                filter_conditions.append({"document_id": {"$in": [str(d) for d in document_ids]}})

        return cast(Where, {"$and": filter_conditions})

    def upsert_document_chunks(
        self,
        user_id: str,
        repository_id: str,
        document_id: str,
        document_title: str,
        chunks: List[Dict[str, Any]],
        embeddings: Optional[List[List[float]]] = None
    ) -> int:
        """
        Upserts extracted and embedded text chunks into ChromaDB with tenant metadata tags.
        Each chunk is strictly mapped to (user_id, repository_id, document_id, page_number).
        """
        if not chunks:
            return 0

        ids = []
        documents = []
        metadatas = []

        for idx, chunk in enumerate(chunks):
            chunk_id = chunk.get("chunk_id", f"{document_id}_p{chunk.get('page_number', 1)}_c{idx}")
            ids.append(chunk_id)
            documents.append(chunk["text"])
            metadatas.append({
                "user_id": str(user_id),
                "repository_id": str(repository_id),
                "document_id": str(document_id),
                "document_title": str(document_title),
                "page_number": int(chunk.get("page_number", 1)),
                "chunk_index": int(idx)
            })

        kwargs: Dict[str, Any] = {
            "ids": ids,
            "documents": documents,
            "metadatas": metadatas
        }

        if embeddings:
            kwargs["embeddings"] = embeddings

        self.collection.upsert(**kwargs)
        return len(ids)

    def query_repository_chunks(
        self,
        user_id: str,
        repository_id: str,
        query_text: Optional[str] = None,
        query_embedding: Optional[List[float]] = None,
        top_k: int = 5,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes semantic similarity search with mandatory compound multi-tenant pre-filtering.
        Optionally restricts matches to a targeted subset of document IDs.
        """
        where_filter = self.build_tenant_filter(user_id, repository_id, document_ids)

        kwargs: Dict[str, Any] = {
            "n_results": top_k,
            "where": where_filter
        }

        if query_embedding:
            kwargs["query_embeddings"] = [query_embedding]
        elif query_text:
            kwargs["query_texts"] = [query_text]
        else:
            raise ValueError("Either query_text or query_embedding must be supplied.")

        results = self.collection.query(**kwargs)

        # Normalize ChromaDB results into a clean list of chunk dictionaries
        formatted_results: List[Dict[str, Any]] = []
        if results and results.get("documents") and results["documents"]:
            docs = results["documents"][0]
            metadatas_list = results.get("metadatas")
            metas = metadatas_list[0] if metadatas_list else []
            distances_list = results.get("distances")
            distances = distances_list[0] if distances_list else []
            ids_list = results.get("ids")
            ids = ids_list[0] if ids_list else []

            for i in range(len(docs)):
                doc_text = docs[i]
                metadata_item = metas[i] if i < len(metas) and metas[i] is not None else {}
                dist_val = distances[i] if i < len(distances) and distances[i] is not None else None
                sim_val = round(1 - dist_val, 4) if dist_val is not None else None
                id_val = ids[i] if i < len(ids) else None

                formatted_results.append({
                    "id": id_val,
                    "text": doc_text,
                    "metadata": metadata_item,
                    "distance": dist_val,
                    "similarity": sim_val
                })

        return formatted_results

    def delete_document_chunks(self, user_id: str, repository_id: str, document_id: str) -> None:
        """
        Deletes all vector chunks belonging to a specific document within the user's workspace.
        """
        delete_filter = cast(Where, {
            "$and": [
                {"user_id": {"$eq": str(user_id)}},
                {"repository_id": {"$eq": str(repository_id)}},
                {"document_id": {"$eq": str(document_id)}}
            ]
        })
        self.collection.delete(where=delete_filter)

    def delete_repository_chunks(self, user_id: str, repository_id: str) -> None:
        """
        Cascade deletes all vector chunks belonging to an entire workspace repository.
        """
        delete_filter = self.build_tenant_filter(user_id, repository_id)
        self.collection.delete(where=delete_filter)

    def count_repository_chunks(self, user_id: str, repository_id: str) -> int:
        """
        Counts the total indexed chunks for a repository under tenant constraints.
        """
        filter_dict = self.build_tenant_filter(user_id, repository_id)
        result = self.collection.get(where=filter_dict)
        return len(result["ids"]) if result and "ids" in result and result["ids"] is not None else 0


# Global singleton instance
vector_service = ChromaVectorService()
