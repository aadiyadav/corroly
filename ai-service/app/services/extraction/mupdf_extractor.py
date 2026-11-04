from typing import List, Dict, Any, Tuple
import pymupdf as fitz


class ExtractedPage:
    """Represents text extracted from a specific PDF page."""
    def __init__(self, page_number: int, text: str, char_count: int):
        self.page_number = page_number
        self.text = text
        self.char_count = char_count

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_number": self.page_number,
            "text": self.text,
            "char_count": self.char_count
        }


class MuPdfExtractor:
    """
    High-speed PDF text extraction engine using PyMuPDF (fitz).
    Preserves exact academic reading order and page numbering.
    """

    @staticmethod
    def extract_pages(pdf_bytes: bytes) -> Tuple[List[ExtractedPage], Dict[str, Any]]:
        """
        Extracts structured text from raw or compressed PDF bytes on a per-page basis.
        
        Returns:
            Tuple of (extracted_pages_list, metadata_dict)
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        extracted_pages: List[ExtractedPage] = []
        total_chars = 0
        is_scanned_suspicion = False

        try:
            total_pages = len(doc)
            chars_first_few_pages = 0
            check_page_count = min(3, total_pages)

            for page_idx in range(total_pages):
                page = doc.load_page(page_idx)
                # Sort blocks by vertical then horizontal position to preserve reading order
                raw_text = page.get_text("text", sort=True)
                cleaned_text = str(raw_text).strip() if raw_text else ""
                char_count = len(cleaned_text)
                total_chars += char_count

                if page_idx < check_page_count:
                    chars_first_few_pages += char_count

                extracted_pages.append(
                    ExtractedPage(
                        page_number=page_idx + 1,  # 1-indexed
                        text=cleaned_text,
                        char_count=char_count
                    )
                )

            # Heuristic: If first 3 pages average less than 50 characters, document is likely scanned/image-only
            if check_page_count > 0 and (chars_first_few_pages / check_page_count) < 50:
                is_scanned_suspicion = True

            doc_meta = doc.metadata or {}
            meta: Dict[str, Any] = {
                "total_pages": total_pages,
                "total_characters": total_chars,
                "is_scanned": is_scanned_suspicion,
                "title": doc_meta.get("title"),
                "author": doc_meta.get("author")
            }


            return extracted_pages, meta
        finally:
            doc.close()


pdf_extractor = MuPdfExtractor()
