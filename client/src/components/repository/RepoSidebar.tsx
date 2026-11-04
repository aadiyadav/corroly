"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setDocuments,
  setActiveDocumentId,
  removeDocumentFromState,
  updateJobProgress,
} from "@/store/slices/documentSlice";
import {
  toggleThreadDoc,
  selectAllThreadDocs,
  clearThreadDocs,
} from "@/store/slices/chatSlice";
import { openReader, openDiscoveryModal } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import {
  FileText,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Layers,
  Check,
  Plus,
} from "lucide-react";

export const RepoSidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { activeRepositoryId, repositories } = useAppSelector(
    (state) => state.repository
  );
  const { documents, activeDocumentId, ingestionJobs } = useAppSelector(
    (state) => state.document
  );
  const { activeConversationId, selectedDocIdsByThread } = useAppSelector(
    (state) => state.chat
  );

  const { accessToken } = useAppSelector((state) => state.auth);

  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeRepo = repositories.find((r) => r.id === activeRepositoryId);

  const indexedDocs = documents.filter((d) => d.status === "INDEXED");
  const allIndexedDocIds = indexedDocs.map((d) => d.id);

  // If thread hasn't customized selection yet, default to all indexed documents
  const selectedDocIds = activeConversationId
    ? (selectedDocIdsByThread[activeConversationId] ?? allIndexedDocIds)
    : allIndexedDocIds;

  const isAllSelected =
    indexedDocs.length > 0 &&
    indexedDocs.every((d) => selectedDocIds.includes(d.id));

  const handleToggleSelect = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeConversationId) return;
    dispatch(
      toggleThreadDoc({
        threadId: activeConversationId,
        docId,
        allDocIds: allIndexedDocIds,
      })
    );
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeConversationId) return;
    dispatch(
      selectAllThreadDocs({
        threadId: activeConversationId,
        allDocIds: allIndexedDocIds,
      })
    );
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeConversationId) return;
    dispatch(clearThreadDocs({ threadId: activeConversationId }));
  };

  // Fetch documents whenever the active repository changes
  useEffect(() => {
    if (!activeRepositoryId) return;

    let isMounted = true;
    const fetchDocuments = async () => {
      setIsLoadingDocs(true);
      try {
        const response = await api.get(`/repos/${activeRepositoryId}/documents`);
        if (isMounted) {
          dispatch(setDocuments(response.data?.data || []));
        }
      } catch (err) {
        console.error("Failed to fetch documents for workspace", err);
      } finally {
        if (isMounted) setIsLoadingDocs(false);
      }
    };

    fetchDocuments();

    return () => {
      isMounted = false;
    };
  }, [activeRepositoryId, dispatch]);

  // Handle SSE progress stream for active pending jobs
  useEffect(() => {
    if (!activeRepositoryId) return;

    const uncompletedJobs = Object.values(ingestionJobs).filter(
      (job) => !job.isCompleted && !job.isError
    );

    if (uncompletedJobs.length === 0) return;

    const listeners: EventSource[] = [];

    uncompletedJobs.forEach((job) => {
      const tokenParam = accessToken ? `&token=${encodeURIComponent(accessToken)}` : "";
      const sseUrl = `${process.env.NEXT_API_URL || "http://localhost:5000/api/v1"
        }/repos/${activeRepositoryId}/documents/${job.docId}/progress?jobId=${job.jobId}${tokenParam}`;

      const es = new EventSource(sseUrl, { withCredentials: true });

      es.addEventListener("progress", (event) => {
        try {
          const data = JSON.parse(event.data);
          const isDone =
            data.stage?.toUpperCase() === "COMPLETED" ||
            data.stage?.toUpperCase() === "INDEXED" ||
            data.percent === 100;

          dispatch(
            updateJobProgress({
              jobId: job.jobId,
              docId: job.docId,
              percent: data.percent || 50,
              stage: isDone ? "COMPLETED" : (data.stage || "PROCESSING"),
              message: data.message,
              isCompleted: isDone,
              isError: false,
            })
          );

          if (isDone) {
            setTimeout(() => {
              api.get(`/repos/${activeRepositoryId}/documents`).then((res) => {
                if (res.data?.data) {
                  dispatch(setDocuments(res.data.data));
                }
              });
            }, 600);
          }
        } catch (e) {
          console.error("Error parsing progress event", e);
        }
      });

      es.addEventListener("done", () => {
        dispatch(
          updateJobProgress({
            jobId: job.jobId,
            docId: job.docId,
            percent: 100,
            stage: "COMPLETED",
            isCompleted: true,
            isError: false,
          })
        );
        setTimeout(() => {
          api.get(`/repos/${activeRepositoryId}/documents`).then((res) => {
            if (res.data?.data) {
              dispatch(setDocuments(res.data.data));
            }
          });
        }, 600);
        es.close();
      });

      es.addEventListener("error", () => {
        dispatch(
          updateJobProgress({
            jobId: job.jobId,
            docId: job.docId,
            percent: 0,
            stage: "FAILED",
            isCompleted: false,
            isError: true,
            error: "Ingestion interrupted",
          })
        );
        api.get(`/repos/${activeRepositoryId}/documents`).then((res) => {
          dispatch(setDocuments(res.data?.data || []));
        });
        es.close();
      });

      listeners.push(es);
    });

    return () => {
      listeners.forEach((es) => es.close());
    };
  }, [ingestionJobs, activeRepositoryId, dispatch]);

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeRepositoryId) return;

    setDeletingId(docId);
    try {
      await api.delete(`/repos/${activeRepositoryId}/documents/${docId}`);
      dispatch(removeDocumentFromState(docId));
    } catch (err) {
      console.error("Failed to delete document", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside className="w-full h-full flex flex-col bg-transparent p-2 sm:p-3 overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ backgroundColor: activeRepo?.colorTag || "#7f1e23" }}
            />
            <h3 className="text-sm font-bold text-black tracking-tight truncate max-w-[170px]">
              {activeRepo ? activeRepo.name : "Documents"}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-[#737373]">
              {indexedDocs.length} paper{indexedDocs.length === 1 ? "" : "s"} indexed
            </span>
            {indexedDocs.length > 0 && activeConversationId && (
              <>
                <span className="text-[#cccccc] text-[10px]">•</span>
                <button
                  type="button"
                  onClick={isAllSelected ? handleClearAll : handleSelectAll}
                  className="text-[11px] font-semibold text-[#7f1e23] hover:underline transition-colors"
                >
                  {isAllSelected ? "Deselect All" : "Select All"}
                </button>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => dispatch(openDiscoveryModal())}
          className="p-2 rounded-xl bg-white hover:bg-accent/50 hover:text-primary text-black border border-black/10 shadow-sm transition-all flex items-center gap-1"
          title="Discover Papers"
        >
          <Search className="w-4 h-4" />
          <span className="text-xs font-medium sm:block hidden">Discover Papers</span>
        </button>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
        {isLoadingDocs ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#7f1e23]" />
          </div>
        ) : documents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-dashed border-black/15">
            <Layers className="w-8 h-8 text-[#737373] mb-2" />
            <p className="text-xs font-semibold text-black">No Papers Ingested</p>
            <p className="text-[11px] text-[#737373] mt-1 max-w-[190px]">
              Use Discovery to find and import academic research into this workspace.
            </p>
            <button
              type="button"
              onClick={() => dispatch(openDiscoveryModal())}
              className="mt-3 px-3 py-1.5 rounded-full bg-[#7f1e23] text-white text-[11px] font-semibold shadow-sm hover:scale-105 transition-all"
            >
              Discover Papers
            </button>
          </div>
        ) : (
          documents.map((doc) => {
            const isSelected = doc.id === activeDocumentId;
            const isDocSelected = selectedDocIds.includes(doc.id);
            const job = Object.values(ingestionJobs).find((j) => j.docId === doc.id);
            const isProcessing =
              doc.status === "PROCESSING" ||
              doc.status === "PENDING" ||
              (job && !job.isCompleted && !job.isError);

            return (
              <div
                key={doc.id}
                onClick={() => {
                  dispatch(setActiveDocumentId(doc.id));
                  if (doc.status === "INDEXED") {
                    dispatch(openReader({ doc, page: 1 }));
                  }
                }}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${isSelected
                    ? "bg-[#ffd4a5]/50 shadow-sm text-black border-[#ffd4a5]"
                    : isDocSelected
                      ? "bg-[#fffaf5]/50 hover:bg-[#fff5eb] text-black border-[#ffd4a5]/60 shadow-sm"
                      : "bg-white hover:bg-zinc-50 text-black border-black/10 shadow-sm"
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText
                      className={`w-4 h-4 shrink-0 ${isSelected || isDocSelected
                          ? "text-[#7f1e23]"
                          : "text-[#737373]"
                        }`}
                    />
                    <span className="text-xs font-semibold line-clamp-1">
                      {doc.title}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={deletingId === doc.id}
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="text-[#737373] hover:text-[#7f1e23] transition-colors p-1 flex-shrink-0"
                    title="Delete paper"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#7f1e23]" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between text-[10px] text-[#737373] mt-2">
                  <span className="font-medium uppercase tracking-wider">
                    {doc.source}
                  </span>
                  <span>
                    {doc.pageCount ? `${doc.pageCount} pages` : "Processing"}
                  </span>
                </div>

                {/* Real-time Ingestion Progress Indicator */}
                {isProcessing && (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[10px] text-[#7f1e23] font-semibold mb-1">
                      <span>{job?.stage || (doc.status === "PENDING" ? "QUEUED" : "PROCESSING")}</span>
                      <span>{job?.percent || (doc.status === "PENDING" ? 5 : 20)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/70 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-[#7f1e23] rounded-full transition-all duration-300"
                        style={{ width: `${job?.percent || (doc.status === "PENDING" ? 5 : 20)}%` }}
                      />
                    </div>
                  </div>
                )}

                {doc.status === "INDEXED" && !isProcessing && (
                  <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 text-black font-medium">
                      <CheckCircle className="w-3 h-3 text-[#7f1e23]" />
                      Indexed
                    </span>

                    {/* Dedicated Select / Deselect Button */}
                    {activeConversationId && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelect(doc.id, e)}
                        className={`group flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all active:scale-95 shadow-sm ${isDocSelected
                            ? "bg-[#7f1e23] text-white hover:bg-[#63161a]"
                            : "bg-white text-[#737373] hover:text-[#7f1e23] hover:border-[#7f1e23]/30 border border-[#e2e2e2]"
                          }`}
                        title={isDocSelected ? "Click to deselect from discussion" : "Click to select for discussion"}
                      >
                        {isDocSelected ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span className="group-hover:hidden">Selected</span>
                            <span className="hidden group-hover:inline">Deselect</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Select</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {doc.status === "FAILED" && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-[#7f1e23] font-medium">
                    <AlertCircle className="w-3 h-3 text-[#7f1e23]" />
                    <span>Ingestion failed</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
