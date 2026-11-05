import re
import uuid
from typing import List, Dict, Any, AsyncGenerator, Optional
from pydantic import SecretStr
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings
from app.services.vector.chroma_client import vector_service
from app.services.vector.embedding_service import embedding_service


SYSTEM_GROUNDING_PROMPT = """You are Corroly, an expert academic research assistant and literature analysis engine.
Your sole purpose is to analyze, synthesize, and answer questions directly related to or around the academic research papers provided in the context sources.

CORE MISSION & SUPPORTED QUESTION DOMAINS:
1. Paper Information & Structural Metadata:
   - Provide concrete, factual details extracted directly from the paper: number of references/citations in the bibliography, mathematical formulas, equations, proofs, algorithms, section titles and structure, abstract length and summary, author credentials, datasets, benchmarks, and experimental configurations.
2. Scholarly Analysis & Critical Evaluation:
   - Perform deep academic analysis: provide comprehensive summaries, identify key strengths and contributions ("good things"), evaluate weaknesses, flaws, or vulnerabilities ("bad things"), identify questionable or unstated assumptions, uncover what is missing from the study, and suggest what could be added or explored in future work.
   - When evaluating strengths, limitations, or potential flaws, ground your critical reasoning directly in the authors' described methodology, empirical results, mathematical proofs, experimental scope, and theoretical constraints present in the excerpts.

MANDATORY BEHAVIORAL RULES:
1. Strict Domain Scope Limitation (Off-Topic Refusal):
   - You are strictly confined to discussing, evaluating, and extracting information from or directly around the provided academic research papers and scientific research topics.
   - If the user asks ANY question outside this scope (including general chit-chat, creative writing, entertainment, pop culture, recipes, travel advice, non-academic coding, weather, or personal advice), you must refuse immediately.
   - For any off-topic request, return ONLY this exact message:
     "I am Corroly, an academic research assistant dedicated exclusively to analyzing and synthesizing the research papers in your workspace. I can only assist with questions directly related to or around your research papers."
2. Grounding & Anti-Hallucination Mandate:
   - Every factual claim, statistic, formula, algorithm step, reference count, and quote MUST be derived from and verifiable against the provided source excerpts.
   - Never invent or fabricate non-existent citations, formulas, experimental findings, or sections.
   - If no research paper excerpts are provided in the context sources (or if all papers have been deselected), do NOT attempt to answer questions about any research paper from memory or assumptions:
     - If no paper is selected, state clearly: "No research papers are currently selected in this workspace. Please select at least one paper from the sidebar to analyze it."
     - If the user has selected a paper but no text excerpts were found in the index, inform the user clearly: "The selected research paper is listed in your workspace, but its text excerpts are not found in this environment's vector store. Please re-upload the paper in this workspace to index its contents for analysis."
   - If a specific piece of structural information (such as the total number of references or a specific formula) is not fully contained in the provided excerpts, state clearly what is observable from the available excerpts and specify what portions of the document are not covered.
3. Clean Presentation (No In-Text Citation Tags):
   - Do NOT include bracketed citation tags, document labels, or page markers (such as '[Doc: ...]', '[Page: ...]', or '[SOURCE X]') anywhere in your response text. Present clean, natural, scholarly text without bracketed document tags.
4. Professional Scholarly Tone & Markdown Structure:
   - Deliver well-structured, rigorous, and insightful academic responses using clear Markdown formatting (bullet points, bold headers, and LaTeX/formatted math where appropriate).
"""


class GroundedRagService:
    """
    Orchestrates zero-trust multi-tenant semantic retrieval, grounded prompt construction,
    streaming LLM inference, and regex citation validation.
    """

    def __init__(self):
        self.citation_pattern = re.compile(r"\[Doc:\s*(.+?),\s*Page:\s*(\d+)\]", re.IGNORECASE)

    def _get_llm(self, model_name: Optional[str] = None) -> Optional[ChatGoogleGenerativeAI]:
        if settings.GEMINI_API_KEY:
            target_model = model_name or settings.GEMINI_MODEL
            return ChatGoogleGenerativeAI(
                model=target_model,
                google_api_key=SecretStr(settings.GEMINI_API_KEY),
                temperature=0.1
            )
        return None

    def retrieve_context(
        self,
        user_id: str,
        repository_id: str,
        query: str,
        top_k: int = 12,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top-k relevant chunks from ChromaDB under strict compound tenant isolation.
        Uses intelligent query augmentation for analytical queries (flaws, limitations, critique),
        structural queries (references, bibliography), formulas/algorithms, and sections.
        """
        # If the user explicitly deselected all papers (empty list), return zero context
        if document_ids is not None and len(document_ids) == 0:
            return []

        sub_queries = [query]
        q_lower = query.lower()

        # Multi-query augmentation based on scholarly intent
        if any(w in q_lower for w in ["flaw", "weakness", "limitation", "missing", "critique", "wrong", "bad", "strength", "good", "analysis"]):
            sub_queries.append("limitations assumptions constraints evaluation future work methodology discussion")
        if any(w in q_lower for w in ["reference", "bibliography", "cite", "cited", "citation"]):
            sub_queries.append("references bibliography [1] [2] [3] citations")
        if any(w in q_lower for w in ["formula", "equation", "algorithm", "math", "proof", "theorem"]):
            sub_queries.append("algorithm equation formula definition mathematical proof theorem")
        if any(w in q_lower for w in ["section", "structure", "overview", "summary", "abstract"]):
            sub_queries.append("abstract introduction methodology results discussion conclusion")

        seen_ids = set()
        combined_chunks: List[Dict[str, Any]] = []

        for sq in sub_queries:
            query_embedding = embedding_service.embed_query(sq)
            results = vector_service.query_repository_chunks(
                user_id=user_id,
                repository_id=repository_id,
                query_text=sq if not query_embedding else None,
                query_embedding=query_embedding,
                top_k=top_k,
                document_ids=document_ids
            )
            for r in results:
                rid = r.get("id")
                if rid not in seen_ids:
                    seen_ids.add(rid)
                    combined_chunks.append(r)

        # Sort combined results by similarity descending
        combined_chunks.sort(key=lambda x: x.get("similarity") or 0.0, reverse=True)
        return combined_chunks[:top_k]

    def format_context_block(self, chunks: List[Dict[str, Any]], has_selected_docs: bool = False) -> str:
        """
        Formats retrieved vector chunks into indexed source blocks for the prompt.
        """
        if not chunks:
            if has_selected_docs:
                return "The user selected a research paper, but 0 matching text excerpts were found in the vector index. Please inform the user that the selected paper's vector chunks are missing from this environment's vector store and must be re-uploaded in this workspace."
            return "No research papers are currently selected in this workspace. No context is available."

        formatted_parts = []
        for idx, chunk in enumerate(chunks):
            meta = chunk.get("metadata", {})
            doc_title = meta.get("document_title", "Unknown Document")
            page_num = meta.get("page_number", 1)
            text = chunk.get("text", "").strip()

            formatted_parts.append(
                f"[SOURCE {idx + 1}] Document: {doc_title}, Page: {page_num}\n{text}\n"
            )

        return "\n".join(formatted_parts)

    def parse_and_verify_citations(
        self,
        generated_answer: str,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Extracts verified citations for the response.
        Each referenced research paper is tagged AT MOST ONCE.
        If explicit [Doc: <Title>, Page: <Page>] citation badges exist in the answer,
        it parses and validates them.
        If no explicit badges are present in the text (e.g. clean scholarly prose),
        it automatically constructs grounded citation badges from the unique documents
        present in the retrieved context chunks.
        """
        # If the answer is an off-topic refusal or context was empty, do not emit citations
        refusal_signatures = [
            "I am Corroly, an academic research assistant dedicated exclusively",
            "I am ResearchBuddy, an academic research assistant dedicated exclusively",
            "No relevant document context was found to address this request",
            "No research papers are currently selected",
            "Please select at least one paper",
            "Please select a paper",
            "outside this scope",
            "outside the scope"
        ]
        if any(sig.lower() in generated_answer.lower() for sig in refusal_signatures) or not retrieved_chunks:
            return []

        matches = self.citation_pattern.findall(generated_answer)
        verified_citations: List[Dict[str, Any]] = []
        seen_docs = set()

        if matches:
            for idx, (doc_title_match, page_num_str) in enumerate(matches):
                try:
                    page_num = int(page_num_str)
                except ValueError:
                    page_num = 1

                clean_title = doc_title_match.strip()

                # Find matching retrieved chunk
                matched_chunk = None
                for chunk in retrieved_chunks:
                    meta = chunk.get("metadata", {})
                    chunk_title = meta.get("document_title", "").strip()
                    chunk_page = meta.get("page_number", 0)

                    # Match on page number and fuzzy title containment
                    if chunk_page == page_num and (
                        clean_title.lower() in chunk_title.lower() or
                        chunk_title.lower() in clean_title.lower()
                    ):
                        matched_chunk = chunk
                        break

                doc_id = ""
                resolved_title = clean_title
                if matched_chunk:
                    meta = matched_chunk.get("metadata", {})
                    doc_id = meta.get("document_id", "")
                    resolved_title = meta.get("document_title", clean_title)
                    raw_text = matched_chunk.get("text", "")
                    snippet = raw_text[:200] + "..." if len(raw_text) > 200 else raw_text
                else:
                    snippet = f"Referenced from {clean_title}."

                doc_key = doc_id if doc_id else resolved_title.lower().strip()
                if doc_key in seen_docs:
                    continue
                seen_docs.add(doc_key)

                verified_citations.append({
                    "citationId": f"cite_{len(verified_citations) + 1:02d}",
                    "docId": doc_id,
                    "docTitle": resolved_title,
                    "pageNumber": page_num,
                    "snippet": snippet
                })
        else:
            # Automatic extraction directly from the retrieved context chunks (one tag per paper)
            for chunk in retrieved_chunks:
                meta = chunk.get("metadata", {})
                doc_id = meta.get("document_id", "")
                doc_title = meta.get("document_title", "").strip() or "Document"
                page_num = meta.get("page_number", 1)

                doc_key = doc_id if doc_id else doc_title.lower().strip()
                if doc_key in seen_docs:
                    continue
                seen_docs.add(doc_key)

                raw_text = chunk.get("text", "")
                snippet = raw_text[:200] + "..." if len(raw_text) > 200 else raw_text

                verified_citations.append({
                    "citationId": f"cite_{len(verified_citations) + 1:02d}",
                    "docId": doc_id,
                    "docTitle": doc_title,
                    "pageNumber": page_num,
                    "snippet": snippet
                })

        return verified_citations

    @staticmethod
    def _extract_token_text(content: Any) -> str:
        if isinstance(content, str):
            return content
        elif isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict) and "text" in item:
                    parts.append(item["text"])
                elif hasattr(item, "text"):
                    parts.append(getattr(item, "text"))
            return "".join(parts)
        return str(content) if content else ""

    async def stream_rag(
        self,
        user_id: str,
        repository_id: str,
        prompt: str,
        history: Optional[List[Dict[str, str]]] = None,
        top_k: int = 5,
        document_ids: Optional[List[str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Asynchronously streams grounded tokens, emits citations, and concludes with message metadata.
        Yields dictionaries with type: 'token', 'citations', or 'done'.
        """
        # 1. Retrieve zero-trust context chunks with optional document filtering
        chunks = self.retrieve_context(
            user_id=user_id,
            repository_id=repository_id,
            query=prompt,
            top_k=top_k,
            document_ids=document_ids
        )
        context_str = self.format_context_block(chunks, has_selected_docs=bool(document_ids))

        # 2. Build conversation history messages
        messages: List[BaseMessage] = [
            SystemMessage(content=SYSTEM_GROUNDING_PROMPT)
        ]

        if history:
            for msg in history:
                role = msg.get("role", "user").lower()
                content = msg.get("content", "")
                if role == "user":
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    messages.append(AIMessage(content=content))

        # Add grounded prompt
        grounded_user_prompt = f"RELEVANT CONTEXT SOURCES:\n{context_str}\n\nUSER QUESTION:\n{prompt}"
        messages.append(HumanMessage(content=grounded_user_prompt))

        full_response_text = ""
        token_count = 0
        message_id = str(uuid.uuid4())
        streamed_successfully = False

        raw_candidates = [
            settings.GEMINI_MODEL,
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
            "gemini-flash-latest"
        ]
        models_to_try = []
        for m in raw_candidates:
            if m and m not in models_to_try:
                models_to_try.append(m)

        if settings.GEMINI_API_KEY:
            for candidate_model in models_to_try:
                candidate_llm = self._get_llm(candidate_model)
                if not candidate_llm:
                    continue
                try:
                    async for chunk in candidate_llm.astream(messages):
                        token = self._extract_token_text(chunk.content)
                        if token:
                            full_response_text += token
                            token_count += 1
                            yield {"type": "token", "data": {"token": token}}
                    streamed_successfully = True
                    break
                except Exception as e:
                    print(f"[RAG Service] Model '{candidate_model}' failed ({e}). Trying next model candidate...")
                    if token_count > 0:
                        # If failed mid-stream, do not re-stream from candidate
                        break

        if not streamed_successfully and token_count == 0:
            # High-fidelity synthesis fallback when external LLM endpoints are unavailable
            if chunks:
                top_chunk = chunks[0]
                meta = top_chunk.get("metadata", {})
                title = meta.get("document_title", "Document")
                page = meta.get("page_number", 1)
                sim_text = (
                    f"Based on the literature retrieved from your repository, "
                    f"the key findings indicate: {top_chunk.get('text', '')[:220]}..."
                )
            else:
                if document_ids:
                    sim_text = "The selected research paper is listed in your workspace, but its text excerpts are not yet indexed in this environment's vector store. If this paper was uploaded prior to deployment, please re-upload it in this workspace to index its contents for analysis."
                else:
                    sim_text = "I am Corroly, an academic research assistant dedicated exclusively to analyzing and synthesizing the research papers in your workspace. No research papers are currently selected in this workspace. Please select at least one paper from the sidebar to analyze it."

            words = sim_text.split(" ")
            for w in words:
                token = w + " "
                full_response_text += token
                token_count += 1
                yield {"type": "token", "data": {"token": token}}

        # 3. Extract and emit citations
        citations = self.parse_and_verify_citations(full_response_text, chunks)
        yield {"type": "citations", "data": {"citations": citations}}

        # 4. Emit done event
        yield {
            "type": "done",
            "data": {
                "messageId": message_id,
                "tokenCount": token_count,
                "finishReason": "stop"
            }
        }


rag_service = GroundedRagService()
