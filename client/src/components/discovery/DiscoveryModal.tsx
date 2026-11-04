"use client";

import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { closeDiscoveryModal } from "@/store/slices/uiSlice";
import { addDocument, updateJobProgress } from "@/store/slices/documentSlice";
import { api } from "@/lib/api";
import {
  X,
  Search,
  BookOpen,
  Calendar,
  Quote,
  Loader2,
  CheckCircle2,
  Download,
  Trash2,
} from "lucide-react";

interface DiscoveredPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string | null;
  source: "ARXIV" | "PUBMED" | "WIKIPEDIA";
  external_id: string | null;
  doi: string | null;
  pdf_url: string | null;
  citation_count: number | null;
  published_year: number | null;
}

const SOURCES: Array<{ id: "ARXIV" | "PUBMED" | "WIKIPEDIA"; label: string }> = [
  { id: "ARXIV", label: "arXiv" },
  { id: "PUBMED", label: "PubMed" },
  { id: "WIKIPEDIA", label: "Wikipedia" },
];

export const DiscoveryModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDiscoveryModalOpen } = useAppSelector((state) => state.ui);
  const { activeRepositoryId, repositories } = useAppSelector(
    (state) => state.repository
  );
  const { documents } = useAppSelector((state) => state.document);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "ARXIV",
    "PUBMED",
    "WIKIPEDIA",
  ]);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DiscoveredPaper[]>([]);
  const [importingIds, setImportingIds] = useState<Record<string, boolean>>({});
  const [importedIds, setImportedIds] = useState<Record<string, boolean>>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isDiscoveryModalOpen) return null;

  const activeRepo = repositories.find((r) => r.id === activeRepositoryId);

  const toggleSource = (srcId: string) => {
    setSelectedSources((prev) =>
      prev.includes(srcId)
        ? prev.filter((s) => s !== srcId)
        : [...prev, srcId]
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed || !activeRepositoryId) return;

    setIsSearching(true);
    setErrorMsg(null);
    setHasSearched(true);
    setLastSearchedQuery(trimmed);

    try {
      const response = await api.post(
        `/repos/${activeRepositoryId}/discovery/search`,
        {
          query: trimmed,
          sources: selectedSources.length > 0 ? selectedSources : undefined,
          limit: 16,
        }
      );

      const raw = response.data?.data;
      const papers: DiscoveredPaper[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.papers)
        ? raw.papers
        : [];
      setResults(papers);
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Search failed. Please refine your query.";
      setErrorMsg(serverMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearResults = () => {
    setResults([]);
    setHasSearched(false);
    setLastSearchedQuery("");
    setErrorMsg(null);
  };

  const handleImport = async (paper: DiscoveredPaper) => {
    if (!activeRepositoryId || !paper.pdf_url) return;

    setImportingIds((prev) => ({ ...prev, [paper.id]: true }));
    setErrorMsg(null);

    try {
      const response = await api.post(
        `/repos/${activeRepositoryId}/documents/import-discovered`,
        {
          title: paper.title,
          authors: paper.authors,
          abstract: paper.abstract || undefined,
          source: paper.source,
          externalId: paper.external_id || undefined,
          downloadUrl: paper.pdf_url,
        }
      );

      const { document, jobId } = response.data.data;
      dispatch(addDocument(document));
      dispatch(
        updateJobProgress({
          jobId,
          docId: document.id,
          percent: 5,
          stage: "DISCOVERY_QUEUE",
          isCompleted: false,
          isError: false,
        })
      );

      setImportedIds((prev) => ({ ...prev, [paper.id]: true }));
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Failed to import paper.";
      setErrorMsg(serverMessage);
    } finally {
      setImportingIds((prev) => ({ ...prev, [paper.id]: false }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col relative transition-all overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-6 pb-4 flex items-start justify-between border-b-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-black tracking-tight">
                Academic Paper Discovery
              </h2>
            </div>
            <p className="text-xs text-[#737373] mt-1">
              Targeting workspace:{" "}
              <span className="font-semibold text-primary">
                {activeRepo ? activeRepo.name : "None selected"}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => dispatch(closeDiscoveryModal())}
            className="w-8 h-8 shrink-0 rounded-full bg-[#f5f5f5] hover:bg-[#eaeaea] text-[#737373] hover:text-black flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input & Source Filters */}
        <div className="px-6 pb-4 flex flex-col gap-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#737373] absolute md:left-4 left-3 top-3" />
              <input
                type="text"
                placeholder="Search quantum physics, CRISPR, transformer architectures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:pl-11 pl-8 md:pr-10 pr-8 py-3 bg-muted/20 rounded-2xl text-xs text-black placeholder-[#737373] outline-none transition-colors focus:bg-[#ebebeb]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-[#737373] hover:text-black transition-colors"
                  title="Clear search query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="md:px-6 px-3 py-3 rounded-2xl bg-[#7f1e23] hover:bg-[#7f1e23]/90 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                "Search"
              )}
            </button>
            {results.length > 0 && (
              <button
                type="button"
                onClick={handleClearResults}
                className="px-4 py-3 rounded-2xl bg-[#f5f5f5] hover:bg-[#eaeaea] text-[#737373] hover:text-[#7f1e23] text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 border border-transparent hover:border-[#7f1e23]/20"
                title="Clear search results"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Results</span>
              </button>
            )}
          </form>

          {/* Source Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mr-1">
              Sources:
            </span>
            {SOURCES.map((src) => {
              const active = selectedSources.includes(src.id);
              return (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => toggleSource(src.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    active
                      ? "bg-[#ffd4a5] text-black shadow-sm"
                      : "bg-[#f5f5f5] text-[#737373] hover:text-black"
                  }`}
                >
                  {src.label}
                </button>
              );
            })}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-[#ffd4a5]/40 text-[#7f1e23] text-xs font-medium">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-3">
          {results.length > 0 && (
            <div className="text-xs text-[#737373] px-1 pb-1 border-b border-black/5">
              <span>
                Found <strong className="font-semibold text-black">{results.length}</strong> papers
              </span>
            </div>
          )}
          {results.length === 0 && !isSearching ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-3xl bg-[#f5f5f5] flex items-center justify-center text-[#737373] mb-3">
                <BookOpen className="w-7 h-7 text-[#737373]" />
              </div>
              <h3 className="text-sm font-semibold text-black">
                {hasSearched
                  ? "No Papers Found"
                  : "Search Across Thousands of Scientific Papers"}
              </h3>
              <p className="text-xs text-[#737373] max-w-sm mt-1">
                {hasSearched
                  ? `No papers found matching "${lastSearchedQuery}". Try different keywords or enabling more sources.`
                  : "Enter research keywords above to query arXiv, PubMed, and Wikipedia simultaneously."}
              </p>
            </div>
          ) : (
            results.map((paper) => {
              const isAlreadyImported =
                importedIds[paper.id] ||
                documents.some((d) => d.title.toLowerCase() === paper.title.toLowerCase());
              const isImporting = importingIds[paper.id];

              return (
                <div
                  key={paper.id}
                  className="p-5 rounded-2xl bg-[#f5f5f5] hover:bg-[#eaeaea]/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ffd4a5] text-black">
                        {paper.source}
                      </span>
                      {paper.published_year && (
                        <span className="flex items-center gap-1 text-[11px] text-[#737373]">
                          <Calendar className="w-3 h-3 text-muted" />
                          {paper.published_year}
                        </span>
                      )}
                      {typeof paper.citation_count === "number" && paper.citation_count > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-[#737373]">
                          <Quote className="w-3 h-3 text-[#737373]" />
                          {paper.citation_count.toLocaleString()} citations
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-black leading-snug">
                      {paper.title}
                    </h4>

                    {paper.authors && paper.authors.length > 0 && (
                      <p className="text-xs text-[#737373] mt-1 line-clamp-1">
                        {paper.authors.join(", ")}
                      </p>
                    )}

                    {paper.abstract && (
                      <p className="text-xs text-[#737373] mt-2 line-clamp-2 leading-relaxed">
                        {paper.abstract}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {paper.pdf_url ? (
                      <button
                        type="button"
                        disabled={isImporting || isAlreadyImported}
                        onClick={() => handleImport(paper)}
                        className={`px-4 py-2 rounded-2xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${
                          isAlreadyImported
                            ? "bg-white text-black opacity-80 cursor-default"
                            : "bg-[#7f1e23] hover:bg-[#7f1e23]/90 text-white active:scale-95"
                        }`}
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Queuing...</span>
                          </>
                        ) : isAlreadyImported ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                            <span>In Workspace</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Import to Repo</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#737373] italic">
                        No PDF link
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
