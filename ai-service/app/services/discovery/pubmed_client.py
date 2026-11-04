from typing import List
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings
from app.services.discovery.models import DiscoveredPaper


class PubMedClient:
    """
    Client for NCBI Entrez E-utilities (PubMed API).
    """
    ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    ESUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=5), reraise=False)
    async def search(self, query: str, limit: int = 10) -> List[DiscoveredPaper]:
        params = {
            "db": "pubmed",
            "term": query,
            "retmode": "json",
            "retmax": limit,
            "sort": "pub_date",
        }
        if settings.NCBI_PUBMED_API_KEY:
            params["api_key"] = settings.NCBI_PUBMED_API_KEY

        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                search_res = await client.get(self.ESEARCH_URL, params=params)
                if search_res.status_code != 200:
                    return []
                id_list = search_res.json().get("esearchresult", {}).get("idlist", [])
                if not id_list:
                    return []

                # Fetch summaries
                sum_params = {
                    "db": "pubmed",
                    "id": ",".join(id_list),
                    "retmode": "json"
                }
                if settings.NCBI_PUBMED_API_KEY:
                    sum_params["api_key"] = settings.NCBI_PUBMED_API_KEY

                sum_res = await client.get(self.ESUMMARY_URL, params=sum_params)
                if sum_res.status_code != 200:
                    return []
                results_dict = sum_res.json().get("result", {})
        except Exception:
            return []

        papers: List[DiscoveredPaper] = []
        for pmid in id_list:
            item = results_dict.get(pmid)
            if not item:
                continue

            title = item.get("title") or "Untitled"
            sortpubdate = item.get("sortpubdate") or ""
            pubdate = item.get("pubdate") or ""
            year = None

            if sortpubdate and len(sortpubdate) >= 4 and sortpubdate[:4].isdigit():
                year = int(sortpubdate[:4])
            elif pubdate:
                parts = pubdate.split()
                for part in parts:
                    if part.isdigit() and len(part) == 4:
                        year = int(part)
                        break

            authors = []
            for a in item.get("authors", []):
                if isinstance(a, dict) and a.get("name"):
                    authors.append(a["name"])

            article_ids = item.get("articleids", [])
            doi = None
            pmc_id = None
            for aid in article_ids:
                if aid.get("idtype") == "doi":
                    doi = aid.get("value")
                elif aid.get("idtype") == "pmc":
                    pmc_id = aid.get("value")

            # Note: NCBI PMC blocks direct automated programmatic PDF downloads with an HTML interstitial page.
            # arXiv and Semantic Scholar provide direct raw PDF downloads. PubMed papers can be uploaded directly by users.
            pdf_url = None

            papers.append(
                DiscoveredPaper(
                    id=f"pmid_{pmid}",
                    title=title,
                    authors=authors,
                    abstract=None,  # PubMed ESummary does not include full abstract
                    source="PUBMED",
                    external_id=pmid,
                    doi=doi,
                    pdf_url=pdf_url,
                    published_year=year,
                    citation_count=None,
                )
            )

        return papers


pubmed_client = PubMedClient()
