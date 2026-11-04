import io
import os
from typing import Dict, Any, Optional
import cloudinary
import cloudinary.uploader
import cloudinary.api
from app.core.config import settings


class CloudinaryStorageService:
    """
    Production cloud blob storage service for compressed academic PDFs.
    Streams in-memory ByteIO streams to Cloudinary and persists local fail-safe backups.
    Enforces tenant hierarchy: research_buddy/users/{user_id}/repos/{repo_id}/{doc_id}.pdf
    """

    def __init__(self):
        self.is_configured = bool(
            settings.CLOUDINARY_CLOUD_NAME and
            settings.CLOUDINARY_API_KEY and
            settings.CLOUDINARY_API_SECRET
        )

        if self.is_configured:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True
            )

    @staticmethod
    def get_storage_dir() -> str:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "storage", "pdfs"))
        os.makedirs(base_dir, exist_ok=True)
        return base_dir

    def get_local_pdf_path(self, doc_id: str) -> Optional[str]:
        pdf_path = os.path.join(self.get_storage_dir(), f"{doc_id}.pdf")
        return pdf_path if os.path.exists(pdf_path) else None

    def save_local_pdf(self, doc_id: str, pdf_bytes: bytes) -> str:
        pdf_path = os.path.join(self.get_storage_dir(), f"{doc_id}.pdf")
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)
        return pdf_path

    @staticmethod
    def build_public_id(user_id: str, repo_id: str, doc_id: str) -> str:
        """Constructs canonical tenant-isolated asset public ID."""
        return f"research_buddy/users/{user_id}/repos/{repo_id}/{doc_id}"

    @staticmethod
    def build_folder_prefix(user_id: str, repo_id: str) -> str:
        """Constructs repository folder prefix for cascade deletion."""
        return f"research_buddy/users/{user_id}/repos/{repo_id}/"

    def upload_pdf_stream(
        self,
        user_id: str,
        repo_id: str,
        doc_id: str,
        pdf_bytes: bytes
    ) -> Dict[str, Any]:
        """
        Uploads in-memory PDF byte stream to Cloudinary as raw asset.
        Persists a local copy as a fail-safe backup for reader preview.
        
        Returns:
            Dictionary containing secure_url, public_id, and bytes.
        """
        public_id = self.build_public_id(user_id, repo_id, doc_id)

        # Always save a local copy so the PDF reader never loses access
        self.save_local_pdf(doc_id, pdf_bytes)

        local_fallback_url = f"http://localhost:5000/api/v1/repos/{repo_id}/documents/{doc_id}/file"

        if not self.is_configured:
            return {
                "secure_url": local_fallback_url,
                "public_id": public_id,
                "bytes": len(pdf_bytes),
                "format": "pdf",
                "is_mock": True
            }

        try:
            buffer = io.BytesIO(pdf_bytes)
            upload_result = cloudinary.uploader.upload_large(
                buffer,
                public_id=public_id,
                resource_type="raw",
                overwrite=True,
                use_filename=False,
                unique_filename=False,
                tags=[f"user_{user_id}", f"repo_{repo_id}"]
            )
            res_dict = upload_result or {}

            return {
                "secure_url": res_dict.get("secure_url") or local_fallback_url,
                "public_id": public_id,
                "bytes": res_dict.get("bytes", len(pdf_bytes)),
                "format": "pdf",
                "is_mock": False
            }
        except Exception as e:
            print(f"[Cloudinary Warning] Upload failed ({e}), falling back to local file stream: {local_fallback_url}")
            return {
                "secure_url": local_fallback_url,
                "public_id": public_id,
                "bytes": len(pdf_bytes),
                "format": "pdf",
                "is_mock": True,
                "error": str(e)
            }

    def delete_pdf_asset(self, public_id: str) -> Dict[str, Any]:
        """
        Purges a single PDF asset from Cloudinary storage and edge CDN.
        """
        if not self.is_configured or not public_id:
            return {"deleted": True, "public_id": public_id, "is_mock": True}

        try:
            result = cloudinary.uploader.destroy(public_id, resource_type="raw")
            destroy_res = result or {}
            return {
                "deleted": destroy_res.get("result") in ("ok", "not found"),
                "public_id": public_id,
                "result": destroy_res
            }

        except Exception as e:
            return {
                "deleted": False,
                "public_id": public_id,
                "error": str(e)
            }

    def delete_repository_assets(self, user_id: str, repo_id: str) -> Dict[str, Any]:
        """
        Purges all PDF assets under a workspace repository folder.
        """
        prefix = self.build_folder_prefix(user_id, repo_id)
        if not self.is_configured:
            return {"deleted": True, "prefix": prefix, "is_mock": True}

        try:
            # Delete all raw resources matching prefix
            result = cloudinary.api.delete_resources_by_prefix(prefix, resource_type="raw")
            return {
                "deleted": True,
                "prefix": prefix,
                "result": result
            }
        except Exception as e:
            return {
                "deleted": False,
                "prefix": prefix,
                "error": str(e)
            }


storage_service = CloudinaryStorageService()
