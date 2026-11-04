"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  toggleThreadDoc,
  selectAllThreadDocs,
  clearThreadDocs,
} from "@/store/slices/chatSlice";
import {
  setDocuments,
  updateJobProgress,
} from "@/store/slices/documentSlice";
import { openDiscoveryModal } from "@/store/slices/uiSlice";
import { api, getValidAccessToken } from "@/lib/api";
import {
  Layers,
  Plus,
  Check,
  Loader2,
} from "lucide-react";

export const PaperSelectorBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { activeRepositoryId } = useAppSelector((state) => state.repository);
  const { documents, ingestionJobs } = useAppSelector((state) => state.document);
  const { activeConversationId, selectedDocIdsByThread } = useAppSelector(
    (state) => state.chat
  );

  // Fetch documents for the active workspace
  const fetchDocuments = useCallback(async () => {
    if (!activeRepositoryId) return;
    try {
      const response = await api.get(`/repos/${activeRepositoryId}/documents`);
      if (response.data?.data) {
        dispatch(setDocuments(response.data.data));
      }
    } catch (err) {
      console.error("Failed to re-fetch documents in PaperSelectorBar:", err);
    }
  }, [activeRepositoryId, dispatch]);

  // Initial load or repository change fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Detect pending documents or active ingestion jobs
  const uncompletedJobs = Object.values(ingestionJobs).filter(
    (job) => !job.isCompleted && !job.isError
  );
  const pendingDocs = documents.filter(
    (d) => d.status === "PENDING" || d.status === "PROCESSING"
  );
  const isIngesting = pendingDocs.length > 0 || uncompletedJobs.length > 0;

  // Real-time SSE progress watcher for active jobs to trigger immediate re-fetch on completion
  useEffect(() => {
    if (!activeRepositoryId || uncompletedJobs.length === 0) return;

    let isCancelled = false;
    const listeners: EventSource[] = [];

    const connectStreams = async () => {
      const token = await getValidAccessToken();
      if (isCancelled) return;

      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";

      uncompletedJobs.forEach((job) => {
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
              fetchDocuments();
              setTimeout(fetchDocuments, 600);
            }
          } catch (e) {
            console.error("Error parsing progress event in PaperSelectorBar", e);
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
          fetchDocuments();
          setTimeout(fetchDocuments, 600);
          es.close();
        });

        es.addEventListener("error", () => {
          setTimeout(fetchDocuments, 1000);
          es.close();
        });

        listeners.push(es);
      });
    };

    connectStreams();

    return () => {
      isCancelled = true;
      listeners.forEach((es) => es.close());
    };
  }, [uncompletedJobs.length, activeRepositoryId, dispatch, fetchDocuments]);

  // Polling fallback while any paper is pending or indexing to guarantee re-fetch
  useEffect(() => {
    if (!isIngesting || !activeRepositoryId) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 2000);

    return () => clearInterval(interval);
  }, [isIngesting, activeRepositoryId, fetchDocuments]);

  // Documents indexed and ready for retrieval
  const availableDocs = documents.filter((d) => d.status === "INDEXED");
  const allDocIds = availableDocs.map((d) => d.id);

  // Auto-select newly completed documents for this thread
  const prevDocCountRef = useRef(availableDocs.length);
  useEffect(() => {
    if (availableDocs.length > prevDocCountRef.current && activeConversationId) {
      dispatch(
        selectAllThreadDocs({
          threadId: activeConversationId,
          allDocIds,
        })
      );
    }
    prevDocCountRef.current = availableDocs.length;
  }, [availableDocs.length, activeConversationId, allDocIds, dispatch]);

  if (!activeConversationId) return null;

  // If thread hasn't customized selection yet, default to all available documents
  const selectedDocIds =
    selectedDocIdsByThread[activeConversationId] ?? allDocIds;

  const isAllSelected =
    availableDocs.length > 0 &&
    availableDocs.every((d) => selectedDocIds.includes(d.id));

  const handleToggle = (docId: string) => {
    dispatch(
      toggleThreadDoc({
        threadId: activeConversationId,
        docId,
        allDocIds,
      })
    );
  };

  const handleSelectAll = () => {
    dispatch(
      selectAllThreadDocs({
        threadId: activeConversationId,
        allDocIds,
      })
    );
  };

  const handleClear = () => {
    dispatch(clearThreadDocs({ threadId: activeConversationId }));
  };

  // State A: No indexed papers yet
  if (availableDocs.length === 0) {
    if (isIngesting) {
      return (
        <div className="px-4 py-2.5 bg-[#fffaf5] border-b border-[#ffd4a5]/40 flex items-center justify-between text-xs text-[#737373]">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-[#7f1e23] animate-spin flex-shrink-0" />
            <span className="font-semibold text-black">
              Indexing {pendingDocs.length || uncompletedJobs.length} paper{(pendingDocs.length || uncompletedJobs.length) === 1 ? "" : "s"}...
            </span>
            <span className="text-[11px] text-[#737373] hidden sm:inline">
              (Parsing, semantic chunking & indexing)
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#7f1e23] bg-[#ffd4a5] px-2.5 py-0.5 rounded-full animate-pulse">
            Processing
          </span>
        </div>
      );
    }

    return (
      <div className="px-4 py-2 bg-[#fdfdfd] border-b border-[#f5f5f5] flex items-center justify-between text-xs text-[#737373]">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#737373]" />
          <span>No indexed papers in this workspace yet.</span>
        </div>
        <button
          type="button"
          onClick={() => dispatch(openDiscoveryModal())}
          className="text-xs font-semibold text-[#7f1e23] hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          <span>Add Papers</span>
        </button>
      </div>
    );
  }

  // State B: Indexed papers available
  return (
    <div className="px-4 py-2 bg-[#fafafa] border-b border-[#f0f0f0] flex flex-col gap-1.5 transition-all">
      {/* Top Controls Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#7f1e23]" />
          <span className="font-semibold text-black">Target Papers:</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffd4a5] text-[#7f1e23]">
            {selectedDocIds.length} of {availableDocs.length} selected
          </span>
          {isIngesting && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ffd4a5]/40 text-[#7f1e23]">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>Indexing paper...</span>
            </div>
          )}
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={isAllSelected ? handleClear : handleSelectAll}
            className="font-medium text-[#737373] hover:text-black transition-colors"
          >
            {isAllSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
        {availableDocs.map((doc) => {
          const isSelected = selectedDocIds.includes(doc.id);
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => handleToggle(doc.id)}
              title={doc.title}
              className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition-all max-w-[220px] ${isSelected
                  ? "bg-white text-black shadow-sm ring-1 ring-[#7f1e23]/30 font-medium"
                  : "bg-[#f0f0f0] text-[#737373] opacity-75 hover:opacity-100"
                }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${isSelected
                    ? "bg-[#7f1e23] text-white"
                    : "border border-[#cccccc]"
                  }`}
              >
                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
              <span className="truncate">{doc.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
