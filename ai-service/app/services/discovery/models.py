from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class DiscoveredPaper(BaseModel):
    id: str = Field(description="Unique identifier or hash for the paper")
    title: str = Field(description="Title of the research paper or article")
    authors: List[str] = Field(default_factory=list, description="List of author names")
    abstract: Optional[str] = Field(default=None, description="Paper abstract or summary")
    source: Literal["ARXIV", "PUBMED", "WIKIPEDIA"] = Field(description="Data source origin")
    external_id: Optional[str] = Field(default=None, description="External provider ID (e.g. arXiv ID, PMCID)")
    doi: Optional[str] = Field(default=None, description="Digital Object Identifier")
    pdf_url: Optional[str] = Field(default=None, description="Direct URL to downloadable PDF if available")
    citation_count: Optional[int] = Field(default=0, description="Total academic citation count if known")
    published_year: Optional[int] = Field(default=None, description="Year of publication")


class DiscoverySearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500, description="Search keyword or research topic")
    sources: Optional[List[Literal["ARXIV", "PUBMED", "WIKIPEDIA"]]] = Field(
        default=["ARXIV", "PUBMED", "WIKIPEDIA"],
        description="Academic sources to query"
    )
    limit: int = Field(default=10, ge=1, le=50, description="Max papers to return per query")
    page: int = Field(default=1, ge=1, description="Pagination offset page")


class DiscoverySearchResponse(BaseModel):
    papers: List[DiscoveredPaper] = Field(default_factory=list)
    total_results: int = Field(default=0)
