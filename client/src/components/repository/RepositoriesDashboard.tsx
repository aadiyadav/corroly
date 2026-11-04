"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setActiveRepositoryId,
  removeRepositoryFromState,
  Repository,
} from "@/store/slices/repositorySlice";
import {
  openCreateRepoModal,
  setActiveWorkspaceView,
  toggleMobileSidebar,
} from "@/store/slices/uiSlice";
import { getRepoSlug } from "@/lib/slugs";
import { api } from "@/lib/api";
import {
  BookOpen,
  MessageSquare,
  Clock,
  Search,
  ArrowRight,
  Trash2,
  FolderPlus,
  Layers,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Menu,
  Plus,
} from "lucide-react";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";

export const RepositoriesDashboard: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Search & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageRepos, setPageRepos] = useState<Repository[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Deletion Modal States
  const [repoToDelete, setRepoToDelete] = useState<Repository | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 700ms Debounce timer for repository search API trigger
  useEffect(() => {
    if (searchQuery === debouncedQuery) {
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setIsDebouncing(false);
      setCurrentPage(1); // Reset to page 1 on new search query
    }, 700);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery, debouncedQuery]);

  // Fetch paginated repositories from backend with in-flight cancellation
  const fetchRepositories = useCallback(async (signal?: AbortSignal) => {
    setIsFetching(true);
    try {
      const res = await api.get("/repos", {
        params: {
          q: debouncedQuery.trim() || undefined,
          page: currentPage,
          limit: 8,
        },
        signal,
      });
      if (!signal?.aborted && res.data?.data) {
        setPageRepos(res.data.data);
        const pagination = res.data.pagination;
        setTotalCount(pagination?.total ?? res.data.data.length);
        setTotalPages(pagination?.totalPages ?? 1);
      }
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED" || signal?.aborted) {
        return; // In-flight request was aborted for newer input
      }
      console.error("Failed to load repositories from backend:", err);
    } finally {
      if (!signal?.aborted) {
        setIsFetching(false);
        setIsInitialLoading(false);
      }
    }
  }, [debouncedQuery, currentPage]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRepositories(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchRepositories]);

  const handleOpenRepo = (repoId: string) => {
    const target = pageRepos.find((r) => r.id === repoId);
    if (target) {
      dispatch(setActiveRepositoryId(target.id));
      dispatch(setActiveWorkspaceView("workspace"));
      router.push(`/${getRepoSlug(target)}`);
    }
  };

  const handleConfirmDeleteRepo = async () => {
    if (!repoToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/repos/${repoToDelete.id}`);
      dispatch(removeRepositoryFromState(repoToDelete.id));
      setRepoToDelete(null);

      // Compute updated pagination and fetch
      const newTotal = Math.max(0, totalCount - 1);
      const newTotalPages = Math.max(1, Math.ceil(newTotal / 8));
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      } else {
        fetchRepositories();
      }
    } catch (err) {
      console.error("Failed to delete repository:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 30) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  // Helper to generate pagination page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent p-4 sm:p-6 selection:bg-[#ffd4a5] selection:text-black overflow-hidden">
      <div className="max-w-6xl w-full mx-auto flex flex-col h-full min-h-0">
        {/* Header Bar (fixed at top, non-scrolling) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => dispatch(toggleMobileSidebar())}
                title="Open menu"
                className="md:hidden p-2 rounded-xl bg-white border border-black/10 text-black hover:bg-zinc-100 shadow-sm transition-all active:scale-95 flex items-center justify-center shrink-0"
              >
                <Menu className="w-4 h-4 text-black" />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
                Your Repositories
              </h1>
              {(isFetching || isInitialLoading) && (
                <Loader2 className="w-4 h-4 animate-spin text-[#7f1e23] ml-1" />
              )}
            </div>
            <p className="text-xs text-[#737373] mt-1">
              Browse, manage, and inspect your multi-tenant academic workspaces.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Backend Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-9 py-2 bg-white border border-black/10 text-xs text-black rounded-full outline-none focus:ring-1 focus:ring-[#7f1e23] w-52 md:w-72 transition-all shadow-sm"
              />
              {isFetching || isDebouncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7f1e23] absolute right-3.5 top-1/2 -translate-y-1/2" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setDebouncedQuery("");
                    setIsDebouncing(false);
                    setCurrentPage(1);
                  }}
                  className="p-1 rounded-full text-[#737373] hover:text-black absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Scrollable Repo Grid Section only */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 sm:pr-2 [scrollbar-width:thin] [scrollbar-color:#e5e5e5_transparent]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:gap-4 gap-2 pb-4">
            {/* Desktop (lg+): Original Large Box Card (Slot 1 of 3x3 grid) */}
            <div
              onClick={() => dispatch(openCreateRepoModal())}
              className="hidden lg:flex group min-h-[220px] rounded-3xl border-2 border-dashed border-[#e5e5e5] hover:border-accent bg-white/70 hover:bg-white p-6 flex-col items-center justify-center text-center cursor-pointer transition-all shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#7f1e23] mb-3 group-hover:scale-110 transition-transform border border-black/4">
                <FolderPlus className="w-8 h-8 text-[#7f1e23]" />
              </div>
              <h3 className="text-sm font-bold text-black mb-1">Create New Repository</h3>
              <p className="text-xs text-[#737373] max-w-60">
                Set up a new isolated domain for literature ingestion and syntheses.
              </p>
            </div>

            {/* Smaller Screens (< lg): Similar, smaller button of same width but smaller height */}
            <div
              onClick={() => dispatch(openCreateRepoModal())}
              className="lg:hidden group w-full col-span-1 md:col-span-2 rounded-2xl border-2 border-dashed border-[#e5e5e5] hover:border-accent bg-white/70 hover:bg-white p-2 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-xs active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#7f1e23] border border-black/5 group-hover:scale-105 transition-transform shrink-0">
                  <FolderPlus className="w-5 h-5 text-[#7f1e23]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-black tracking-tight truncate">
                    Create New Repository
                  </h3>
                  <p className="text-[10px] text-[#737373] truncate">
                    Set up a new isolated domain for literature ingestion and syntheses.
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-[#ffd4a5]/40 text-[#7f1e23] flex items-center justify-center shrink-0 group-hover:bg-[#ffd4a5] transition-colors">
                <Plus className="w-4 h-4" />
              </div>
            </div>

            {/* Slots 2-9: Rotate up to 8 repositories for the current page OR show loading animation */}
            {(isFetching || isInitialLoading) && pageRepos.length === 0 ? (
              <div className="col-span-1 md:col-span-2 lg:col-span-2 min-h-[160px] lg:min-h-[220px] rounded-3xl border border-dashed border-black/10 bg-white/50 flex flex-col items-center justify-center p-6 text-center shadow-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#7f1e23] mb-2.5" />
                <p className="text-xs font-semibold text-black">Loading repositories...</p>
                <p className="text-[11px] text-[#737373] mt-0.5">Please wait a moment</p>
              </div>
            ) : (
              pageRepos.map((repo) => (
              <div
                key={repo.id}
                onClick={() => handleOpenRepo(repo.id)}
                className="group relative bg-[#ffffff] rounded-3xl shadow-sm hover:shadow-md border border-black/5 transition-all p-6 flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 min-h-[220px]"
              >
                {/* Top Accent Strip */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: repo.colorTag || "#7f1e23" }}
                    />
                    <h3 className="text-base font-bold text-black truncate tracking-tight">
                      {repo.name}
                    </h3>
                  </div>

                  {/* Quick Delete */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRepoToDelete(repo);
                    }}
                    title="Delete repository"
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#737373] hover:text-[#7f1e23] hover:bg-[#7f1e23]/10 transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-[#737373] line-clamp-2 leading-relaxed mb-6 flex-1">
                  {repo.description || "No description provided for this repository."}
                </p>

                {/* Telemetry Footer */}
                <div className="space-y-3 pt-3 border-t border-[#f7f7f7]">
                  <div className="flex items-center justify-between text-xs text-[#737373]">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#737373]" />
                      <span>{repo.documentCount || 0} Papers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#737373]" />
                      <span>{repo.conversationCount || 0} Threads</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[11px] text-[#737373]">
                      <Clock className="w-3.5 h-3.5 text-[#737373]" />
                      <span>Updated {formatRelativeTime(repo.updatedAt)}</span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7f1e23] group-hover:translate-x-0.5 transition-transform">
                      <span>Enter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            )))}
          </div>

          {/* Empty Search State */}
          {pageRepos.length === 0 && !isFetching && debouncedQuery && (
            <div className="text-center py-12 text-[#737373]">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#7f1e23]" />
              <p className="text-xs font-semibold text-black">No repositories match &ldquo;{debouncedQuery}&rdquo;</p>
              <p className="text-[11px] text-[#737373] mt-1">Try another search query or clear the filter.</p>
            </div>
          )}
        </div>

        {/* Bottom Navigation Options (fixed at bottom, non-scrolling) */}
        <div className="flex-shrink-0 pt-3 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
          {/* Telemetry info */}
          <div className="text-xs text-[#737373]">
            {(isFetching || isInitialLoading) && pageRepos.length === 0 ? (
              <span className="flex items-center gap-1.5 text-xs text-[#737373]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7f1e23]" />
                Loading repositories...
              </span>
            ) : (
              <span>
                Showing{" "}
                <span className="font-semibold text-black">
                  {totalCount === 0 ? 0 : (currentPage - 1) * 8 + 1}
                </span>
                –
                <span className="font-semibold text-black">
                  {Math.min(currentPage * 8, totalCount)}
                </span>{" "}
                of <span className="font-semibold text-black">{totalCount}</span> repositories
              </span>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1.5">
            {/* Previous Button */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isFetching}
              className="px-3 py-1.5 rounded-xl border border-black/10 text-xs font-medium bg-white hover:bg-zinc-50 text-black disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {/* Page Number Buttons */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((pageItem, idx) =>
                typeof pageItem === "number" ? (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentPage(pageItem)}
                    disabled={isFetching}
                    className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                      currentPage === pageItem
                        ? "bg-[#7f1e23] text-white shadow-sm"
                        : "bg-white hover:bg-[#f5f5f5] text-black border border-black/10"
                    }`}
                  >
                    {pageItem}
                  </button>
                ) : (
                  <span key={idx} className="px-1 text-xs text-[#737373]">
                    ...
                  </span>
                )
              )}
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isFetching}
              className="px-3 py-1.5 rounded-xl border border-black/10 text-xs font-medium bg-white hover:bg-zinc-50 text-black disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Delete Repository Modal */}
      <ConfirmDeleteModal
        isOpen={!!repoToDelete}
        onClose={() => setRepoToDelete(null)}
        onConfirm={handleConfirmDeleteRepo}
        title="Delete Repository"
        itemType="repository"
        itemName={repoToDelete?.name}
        description="This action cannot be undone. All ingested academic research papers, index vectors, and discussion threads will be permanently erased."
        isLoading={isDeleting}
        confirmLabel="Delete Repository"
      />
    </div>
  );
};
