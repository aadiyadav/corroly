from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.services.extraction.mupdf_extractor import ExtractedPage


class PageBoundedTextSplitter:
    """
    Academic chunking engine enforcing strict page boundary preservation.
    Chunks are generated within individual page contexts so citations can NEVER
    reference ambiguous or multi-page boundaries.
    """

    def __init__(self, chunk_size: int = 900, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n## ", "\n\n### ", "\n\n", "\n", ". ", " ", ""],
            keep_separator=True
        )

    def split_pages(
        self,
        document_id: str,
        pages: List[ExtractedPage]
    ) -> List[Dict[str, Any]]:
        """
        Splits extracted pages into page-isolated semantic chunks.
        
        Returns:
            List of dictionaries containing chunk_id, page_number, chunk_index, and text.
        """
        all_chunks: List[Dict[str, Any]] = []

        for page in pages:
            if not page.text or not page.text.strip():
                continue

            page_chunks = self.splitter.split_text(page.text)
            for idx, chunk_text in enumerate(page_chunks):
                clean_chunk = chunk_text.strip()
                if len(clean_chunk) < 20:  # Skip tiny fragments
                    continue

                chunk_id = f"{document_id}_p{page.page_number}_c{idx}"
                all_chunks.append({
                    "chunk_id": chunk_id,
                    "page_number": page.page_number,
                    "chunk_index": idx,
                    "text": clean_chunk,
                    "char_count": len(clean_chunk)
                })

        return all_chunks


page_splitter = PageBoundedTextSplitter()
