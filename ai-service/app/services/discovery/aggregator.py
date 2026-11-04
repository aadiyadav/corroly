import asyncio
import re
from typing import List, Dict, Set
from app.services.discovery.models import (
    DiscoveredPaper,
    DiscoverySearchRequest,
    DiscoverySearchResponse,
)
from app.services.discovery.arxiv_client import arxiv_client
from app.services.discovery.pubmed_client import pubmed_client
from app.services.discovery.wiki_client import wiki_client


def _normalize_title(title: str) -> str:
    """Removes punctuation and whitespace for fuzzy duplicate detection."""
    return re.sub(r"[^a-z0-9]", "", title.lower())


class MultiSourceDiscoveryAggregator:
    """
    Federated academic literature discovery aggregator.
    Dispatches asynchronous parallel queries to arXiv, PubMed, and Wikipedia,
    normalizes records, removes cross-source duplicates, and ranks by relevance.
    """

    async def search(self, request: DiscoverySearchRequest) -> DiscoverySearchResponse:
        selected_sources = list(request.sources or ["ARXIV", "PUBMED", "WIKIPEDIA"])
        
        # Preserve standard order among selected sources
        source_order = ["ARXIV", "PUBMED", "WIKIPEDIA"]
        ordered_sources = [s for s in source_order if s in selected_sources]
        for s in selected_sources:
            if s not in ordered_sources:
                ordered_sources.append(s)

        fetch_limit = max(request.limit, 12)
        source_tasks = []
        for src in ordered_sources:
            if src == "ARXIV":
                source_tasks.append((src, arxiv_client.search(request.query, limit=fetch_limit)))
            elif src == "PUBMED":
                source_tasks.append((src, pubmed_client.search(request.query, limit=fetch_limit)))
            elif src == "WIKIPEDIA":
                source_tasks.append((src, wiki_client.search(request.query, limit=fetch_limit)))

        if not source_tasks:
            return DiscoverySearchResponse(papers=[], total_results=0)

        # Execute parallel searches with exception isolation
        results = await asyncio.gather(*(t[1] for t in source_tasks), return_exceptions=True)

        seen_titles: Dict[str, DiscoveredPaper] = {}
        seen_external_ids: Set[str] = set()
        papers_by_source: Dict[str, List[DiscoveredPaper]] = {src: [] for src, _ in source_tasks}

        # Deduplication and merging per source
        for (src_name, _), res in zip(source_tasks, results):
            if not isinstance(res, list):
                continue
            for paper in res:
                norm_title = _normalize_title(paper.title)

                # Skip duplicate external IDs
                if paper.external_id and paper.external_id in seen_external_ids:
                    continue

                if norm_title in seen_titles:
                    existing = seen_titles[norm_title]
                    # Merge PDF URL if missing
                    if not existing.pdf_url and paper.pdf_url:
                        existing.pdf_url = paper.pdf_url
                    # Merge citation count if higher
                    if (paper.citation_count or 0) > (existing.citation_count or 0):
                        existing.citation_count = paper.citation_count
                    # Merge abstract if missing
                    if not existing.abstract and paper.abstract:
                        existing.abstract = paper.abstract
                    # Merge DOI if missing
                    if not existing.doi and paper.doi:
                        existing.doi = paper.doi
                else:
                    seen_titles[norm_title] = paper
                    if paper.external_id:
                        seen_external_ids.add(paper.external_id)
                    papers_by_source[src_name].append(paper)

        # Sort within each source by quality (PDF links first, citation count, year)
        for src in papers_by_source:
            papers_by_source[src].sort(
                key=lambda p: (
                    1 if p.pdf_url else 0,
                    p.citation_count or 0,
                    p.published_year or 0
                ),
                reverse=True
            )

        active_sources = [src for src, _ in source_tasks if papers_by_source.get(src)]
        if not active_sources:
            return DiscoverySearchResponse(papers=[], total_results=0)

        # Interleave round-robin across all active sources to guarantee equal distribution
        all_balanced_papers: List[DiscoveredPaper] = []
        source_queues = {src: list(papers_by_source[src]) for src in active_sources}

        while any(source_queues.values()):
            added_any = False
            for src in active_sources:
                if source_queues[src]:
                    all_balanced_papers.append(source_queues[src].pop(0))
                    added_any = True
            if not added_any:
                break

        total_results = len(all_balanced_papers)
        # Apply pagination
        start_idx = (request.page - 1) * request.limit
        end_idx = start_idx + request.limit
        paginated_papers = all_balanced_papers[start_idx:end_idx]

        return DiscoverySearchResponse(
            papers=paginated_papers,
            total_results=total_results
        )


discovery_aggregator = MultiSourceDiscoveryAggregator()
