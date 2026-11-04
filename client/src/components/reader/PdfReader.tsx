"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setReaderPage,
  closeReader,
  clearActiveCitation,
} from "@/store/slices/uiSlice";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  BookOpen,
  ZoomIn,
  ZoomOut,
  FileText,
  Loader2,
} from "lucide-react";
import { getValidAccessToken } from "@/lib/api";

const CustomPagePdfViewer = dynamic(
  () => import("./CustomPagePdfViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-16 gap-3">
        <Loader2 className="w-8 h-8 text-[#7f1e23] animate-spin" />
        <p className="text-xs font-medium text-[#737373]">
          Loading paper viewer...
        </p>
      </div>
    ),
  }
);

export const PdfReader: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isReaderOpen, readerDoc, readerPage, activeCitationId } =
    useAppSelector((state) => state.ui);

  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [streamUrl, setStreamUrl] = useState<string>("");
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [docTotalPages, setDocTotalPages] = useState<number | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const resolvePdfStream = async () => {
      if (!readerDoc) {
        setStreamUrl("");
        setIsLoadingPdf(false);
        return;
      }

      setIsLoadingPdf(true);
      setLoadError(false);

      try {
        const token = await getValidAccessToken();
        const apiUrl = process.env.NEXT_API_URL || "http://localhost:5000/api/v1";
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
        const url = `${apiUrl}/repos/${readerDoc.repositoryId}/documents/${readerDoc.id}/file${tokenParam}`;

        if (!isCancelled) {
          setStreamUrl(url);
          setIsLoadingPdf(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("[PdfReader] Failed to resolve access token for stream:", err);
          setLoadError(true);
          setIsLoadingPdf(false);
        }
      }
    };

    resolvePdfStream();

    return () => {
      isCancelled = true;
    };
  }, [readerDoc?.id, readerDoc?.repositoryId]);

  if (!isReaderOpen || !readerDoc) return null;

  const totalPages = docTotalPages || readerDoc.pageCount || 1;
  const pdfUrlWithPage = streamUrl ? `${streamUrl}#page=${readerPage}` : null;

  const handlePrevPage = () => {
    if (readerPage > 1) {
      dispatch(setReaderPage(readerPage - 1));
    }
  };

  const handleNextPage = () => {
    if (readerPage < totalPages) {
      dispatch(setReaderPage(readerPage + 1));
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-3xl shadow-sm overflow-hidden relative border border-black/10">
      {/* Reader Header / Controls Bar */}
      <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 bg-white flex items-center justify-between shadow-sm z-10 shrink-0 gap-2">
        <div className="hidden sm:flex items-center gap-3 overflow-hidden max-w-[45%]">
          <div className="truncate">
            <h3 className="text-xs font-bold text-black truncate">
              {readerDoc.title}
            </h3>
            <p className="text-[10px] text-[#737373] truncate">
              {readerDoc.authors.join(", ") || "Unknown Authors"}
            </p>
          </div>
        </div>

        {/* Pagination & Zoom Toolbar */}
        <div className="flex items-center gap-2">
          {/* Page Controls */}
          <div className="flex items-center bg-[#f5f5f5] rounded-full p-1 shadow-inner">
            <button
              type="button"
              disabled={readerPage <= 1}
              onClick={handlePrevPage}
              className="w-6 h-6 rounded-full hover:bg-white flex items-center justify-center text-black disabled:opacity-30 transition-colors"
              title="Previous page (Left Arrow)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-semibold text-black px-2.5 shrink-0">
              {readerPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={readerPage >= totalPages}
              onClick={handleNextPage}
              className="w-6 h-6 rounded-full hover:bg-white flex items-center justify-center text-black disabled:opacity-30 transition-colors"
              title="Next page (Right Arrow)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-[#f5f5f5] rounded-full p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(z - 15, 60))}
              className="w-6 h-6 rounded-full hover:bg-white flex items-center justify-center text-black transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-medium text-[#737373] px-1.5">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(z + 15, 180))}
              className="w-6 h-6 rounded-full hover:bg-white flex items-center justify-center text-black transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* External PDF Link */}
          {streamUrl && (
            <a
              href={pdfUrlWithPage || streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-full bg-[#f5f5f5] hover:bg-[#eaeaea] text-black flex items-center justify-center transition-colors"
              title="Open full PDF in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Close Reader */}
          <button
            type="button"
            onClick={() => dispatch(closeReader())}
            className="w-7 h-7 rounded-full bg-[#f5f5f5] hover:bg-[#eaeaea] text-[#737373] hover:text-black flex items-center justify-center transition-colors ml-1"
            title="Close reader"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Citation Focus Banner (when user clicked a citation chip in chat) */}
      {activeCitationId && (
        <div className="bg-[#ffd4a5] px-5 py-2 flex items-center justify-between text-black text-xs font-medium z-10 transition-all">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#7f1e23] animate-pulse" />
            <span>
              Navigated to <strong className="font-bold">Page {readerPage}</strong> referenced by citation.
            </span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(clearActiveCitation())}
            className="text-[11px] underline font-semibold text-[#7f1e23] hover:opacity-80"
          >
            Clear focus
          </button>
        </div>
      )}

      {/* Custom Page-wise PDF Viewer Body */}
      <div className="flex-1 bg-[#f0f0f0] relative overflow-hidden min-h-0 min-w-0">
        {isLoadingPdf ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#7f1e23] animate-spin" />
            <p className="text-xs text-[#737373]">Loading document viewer...</p>
          </div>
        ) : streamUrl && !loadError ? (
          <CustomPagePdfViewer
            fileUrl={streamUrl}
            currentPage={readerPage}
            zoomLevel={zoomLevel}
            onTotalPagesDetected={(pages) => {
              if (pages) setDocTotalPages(pages);
            }}
            onPageChange={(page) => dispatch(setReaderPage(page))}
          />
        ) : (
          <div className="max-w-md w-full bg-white p-7 rounded-3xl shadow-sm text-center">
            <FileText className="w-12 h-12 text-[#7f1e23] mx-auto mb-3" />
            <h4 className="text-sm font-bold text-black mb-1">
              Document Preview Not Ready
            </h4>
            <p className="text-xs text-[#737373] mb-4">
              {readerDoc.status === "PROCESSING"
                ? "This document is still being compressed, linearized, and vector indexed."
                : "The linearized PDF binary is being synchronized."}
            </p>
            {readerDoc.abstract && (
              <div className="text-left bg-[#f5f5f5] p-4 rounded-2xl text-xs text-black leading-relaxed">
                <span className="font-semibold block text-[11px] text-[#737373] uppercase mb-1">
                  Abstract
                </span>
                {readerDoc.abstract}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
