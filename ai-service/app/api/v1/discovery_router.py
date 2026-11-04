from fastapi import APIRouter, Depends
from app.api.v1.dependencies import verify_internal_secret
from app.services.discovery.models import (
    DiscoverySearchRequest,
    DiscoverySearchResponse,
)
from app.services.discovery.aggregator import discovery_aggregator

router = APIRouter(prefix="/discovery", tags=["Literature Discovery"])


@router.post(
    "/search",
    response_model=DiscoverySearchResponse,
    summary="Federated multi-source academic paper discovery"
)
async def search_academic_papers(
    request: DiscoverySearchRequest,
    _: str = Depends(verify_internal_secret)
):
    """
    Executes federated search across arXiv, Semantic Scholar, PubMed, and Wikipedia,
    normalizes records, removes cross-source duplicates, and ranks by relevance.
    """
    return await discovery_aggregator.search(request)
