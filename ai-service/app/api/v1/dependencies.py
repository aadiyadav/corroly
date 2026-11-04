from fastapi import Header, HTTPException, status
from app.core.config import settings


async def verify_internal_secret(
    x_internal_service_key: str = Header(..., alias="X-Internal-Service-Key")
) -> str:
    """
    Validates that incoming requests originate from the internal Express backend
    using the shared service secret.
    """
    if x_internal_service_key != settings.GENAI_INTERNAL_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid internal microservice credentials."
        )
    return x_internal_service_key
