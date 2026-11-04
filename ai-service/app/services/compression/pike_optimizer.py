import io
from typing import Tuple, Dict, Any
import pikepdf


class PikePdfOptimizer:
    """
    High-performance in-memory PDF repair, compression, and linearization engine.
    Uses pikepdf (C++ QPDF bindings) to repair corrupted cross-reference tables,
    generate compressed object streams, and linearize for instant web streaming.
    """

    @staticmethod
    def optimize_pdf_bytes(raw_pdf_bytes: bytes) -> Tuple[bytes, Dict[str, Any]]:
        """
        Takes raw PDF bytes from download or upload, repairs corruptions,
        compresses content streams, and linearizes the PDF.
        
        Returns:
            Tuple of (optimized_bytes, stats_dictionary)
        """
        raw_size = len(raw_pdf_bytes)
        input_stream = io.BytesIO(raw_pdf_bytes)
        output_stream = io.BytesIO()

        # Open and automatically reconstruct xref tables / broken trailers
        with pikepdf.open(input_stream) as pdf:
            page_count = len(pdf.pages)
            
            # Save with linearization (Fast Web View) and maximum safe stream compression
            pdf.save(
                output_stream,
                linearize=True,
                compress_streams=True,
                object_stream_mode=pikepdf.ObjectStreamMode.generate,
                preserve_pdfa=True
            )

        compressed_bytes = output_stream.getvalue()
        compressed_size = len(compressed_bytes)

        # Calculate reduction metrics
        saved_bytes = max(0, raw_size - compressed_size)
        reduction_percentage = round((saved_bytes / raw_size) * 100, 2) if raw_size > 0 else 0.0

        stats: Dict[str, Any] = {
            "raw_size_bytes": raw_size,
            "compressed_size_bytes": compressed_size,
            "saved_bytes": saved_bytes,
            "reduction_percentage": reduction_percentage,
            "page_count": page_count,
            "is_linearized": True
        }

        return compressed_bytes, stats


pdf_optimizer = PikePdfOptimizer()
