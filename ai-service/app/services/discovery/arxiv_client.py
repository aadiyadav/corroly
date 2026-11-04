import xml.etree.ElementTree as ET
from typing import List
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from app.services.discovery.models import DiscoveredPaper


class ArxivClient:
    """
    Client for querying the arXiv Open Access repository via HTTP Atom API.
    """
    BASE_URL = "https://export.arxiv.org/api/query"
    ATOM_NS = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=6), reraise=False)
    async def search(self, query: str, limit: int = 10, start: int = 0) -> List[DiscoveredPaper]:
        params = {
            "search_query": f"all:{query}",
            "start": start,
            "max_results": limit,
            "sortBy": "relevance",
            "sortOrder": "descending",
        }

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()

        return self._parse_atom_response(response.text)

    def _parse_atom_response(self, xml_text: str) -> List[DiscoveredPaper]:
        papers: List[DiscoveredPaper] = []
        try:
            root = ET.fromstring(xml_text)
            for entry in root.findall("atom:entry", self.ATOM_NS):
                id_elem = entry.find("atom:id", self.ATOM_NS)
                title_elem = entry.find("atom:title", self.ATOM_NS)
                summary_elem = entry.find("atom:summary", self.ATOM_NS)
                published_elem = entry.find("atom:published", self.ATOM_NS)

                raw_id = id_elem.text.strip() if id_elem is not None and id_elem.text else ""
                # arXiv ID from format: http://arxiv.org/abs/1706.03762v5
                arxiv_id = raw_id.split("/abs/")[-1] if "/abs/" in raw_id else raw_id
                
                title = " ".join(title_elem.text.split()) if title_elem is not None and title_elem.text else "Untitled"
                abstract = " ".join(summary_elem.text.split()) if summary_elem is not None and summary_elem.text else ""

                authors = []
                for author in entry.findall("atom:author", self.ATOM_NS):
                    name_elem = author.find("atom:name", self.ATOM_NS)
                    if name_elem is not None and name_elem.text:
                        authors.append(name_elem.text.strip())

                # Extract PDF link
                pdf_url = None
                for link in entry.findall("atom:link", self.ATOM_NS):
                    if link.attrib.get("title") == "pdf" or link.attrib.get("type") == "application/pdf":
                        pdf_url = link.attrib.get("href")
                        break
                if not pdf_url and arxiv_id:
                    clean_id = arxiv_id.split("v")[0]
                    pdf_url = f"https://arxiv.org/pdf/{clean_id}.pdf"

                published_year = None
                if published_elem is not None and published_elem.text and len(published_elem.text) >= 4:
                    try:
                        published_year = int(published_elem.text[:4])
                    except ValueError:
                        pass

                papers.append(
                    DiscoveredPaper(
                        id=f"arxiv_{arxiv_id}",
                        title=title,
                        authors=authors,
                        abstract=abstract,
                        source="ARXIV",
                        external_id=arxiv_id,
                        pdf_url=pdf_url,
                        published_year=published_year,
                        citation_count=None,
                    )
                )
        except Exception:
            return []

        return papers


arxiv_client = ArxivClient()
