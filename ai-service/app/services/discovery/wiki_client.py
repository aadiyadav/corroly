import re
from typing import List
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from app.services.discovery.models import DiscoveredPaper


class WikipediaClient:
    """
    Client for Wikipedia REST/Action API for terminology and technical encyclopedia lookups.
    """
    API_URL = "https://en.wikipedia.org/w/api.php"

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=5), reraise=False)
    async def search(self, query: str, limit: int = 5) -> List[DiscoveredPaper]:
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "format": "json",
            "srlimit": limit,
        }

        try:
            async with httpx.AsyncClient(
                timeout=10.0,
                headers={"User-Agent": "Corroly-Bot/1.0 (academic-synthesizer; contact@corroly.io)"}
            ) as client:
                res = await client.get(self.API_URL, params=params)
                if res.status_code != 200:
                    return []
                search_results = res.json().get("query", {}).get("search", [])
        except Exception:
            return []

        papers: List[DiscoveredPaper] = []
        for item in search_results:
            page_id = str(item.get("pageid", ""))
            title = item.get("title", "")
            raw_snippet = item.get("snippet", "")
            # Strip HTML tags from Wikipedia snippets
            clean_snippet = re.sub(r"<[^>]+>", "", raw_snippet)

            papers.append(
                DiscoveredPaper(
                    id=f"wiki_{page_id}",
                    title=f"{title} (Wikipedia Overview)",
                    authors=["Wikipedia Contributors"],
                    abstract=clean_snippet,
                    source="WIKIPEDIA",
                    external_id=page_id,
                    pdf_url=None,
                    citation_count=None,
                    published_year=None,
                )
            )

        return papers


wiki_client = WikipediaClient()
