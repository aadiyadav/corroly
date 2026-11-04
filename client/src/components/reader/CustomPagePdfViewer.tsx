"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import axios from "axios";
import { Loader2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure local PDF.js worker (v4.8.69) with absolute origin URL
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
}

interface CustomPagePdfViewerProps {
  fileUrl: string;
  currentPage: number;
  zoomLevel: number; // e.g. 100 for 100%
  onTotalPagesDetected?: (pages: number) => void;
  onPageChange?: (page: number) => void;
}

export const CustomPagePdfViewer: React.FC<CustomPagePdfViewerProps> = ({
  fileUrl,
  currentPage,
  zoomLevel,
  onTotalPagesDetected,
  onPageChange,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const padding = window.innerWidth < 640 ? 16 : 40;
      return Math.min(Math.max(240, window.innerWidth - padding), 850);
    }
    return 650;
  });
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isFetchingBinary, setIsFetchingBinary] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Monitor container width to provide crisp responsive rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        // Leave comfortable horizontal padding: 16px on mobile, 36px on tablet/desktop
        const padding = rect.width < 640 ? 16 : 36;
        const available = Math.max(240, rect.width - padding);
        setContainerWidth(Math.min(available, 850));
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch the PDF binary in the main thread with axios to avoid Web Worker cross-origin range issues
  useEffect(() => {
    let isCancelled = false;

    const fetchBinary = async () => {
      setIsFetchingBinary(true);
      setFetchError(null);
      setParseError(null);

      try {
        const res = await axios.get(fileUrl, {
          responseType: "arraybuffer",
        });

        if (!isCancelled) {
          setPdfBytes(new Uint8Array(res.data));
          setIsFetchingBinary(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("[CustomPagePdfViewer] Failed to load binary:", err);
          setFetchError(err?.message || "Failed to download PDF binary.");
          setIsFetchingBinary(false);
        }
      }
    };

    fetchBinary();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setParseError(null);
    if (onTotalPagesDetected) {
      onTotalPagesDetected(numPages);
    }
  };

  const onDocumentLoadError = (err: Error) => {
    console.error("[CustomPagePdfViewer] PDF.js Parse Error:", err);
    setParseError(err.message || "Unable to parse PDF binary.");
  };

  // Memoize file object so Document doesn't reload on page/zoom changes
  const fileConfig = useMemo(() => {
    if (!pdfBytes) return null;
    return { data: pdfBytes };
  }, [pdfBytes]);

  // Keyboard navigation for smooth page flipping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "ArrowLeft" && currentPage > 1 && onPageChange) {
        onPageChange(currentPage - 1);
      } else if (
        e.key === "ArrowRight" &&
        numPages &&
        currentPage < numPages &&
        onPageChange
      ) {
        onPageChange(currentPage + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, numPages, onPageChange]);

  const scale = zoomLevel / 100;
  const renderedPageWidth = Math.round(containerWidth * scale);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto overflow-x-auto p-2 sm:p-4 md:py-6 md:px-4 bg-[#f0f0f0]"
    >
      <div className="min-w-full w-max flex flex-col items-center">
        {isFetchingBinary ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3 my-auto">
            <Loader2 className="w-8 h-8 text-[#7f1e23] animate-spin" />
            <p className="text-xs font-medium text-[#737373]">
              Downloading paper binary...
            </p>
          </div>
        ) : fetchError || parseError || !fileConfig ? (
          <div className="max-w-md w-full bg-white p-7 rounded-3xl shadow-sm text-center border border-red-200 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h4 className="text-sm font-bold text-black mb-1">
              Could not render PDF document
            </h4>
            <p className="text-xs text-[#737373] mb-4">
              {fetchError || parseError || "Unable to parse the PDF binary for this paper. You can still open it in a new tab using the top-right button."}
            </p>
          </div>
        ) : (
          <Document
            file={fileConfig}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center p-16 gap-3">
                <Loader2 className="w-8 h-8 text-[#7f1e23] animate-spin" />
                <p className="text-xs font-medium text-[#737373]">
                  Rendering academic paper...
                </p>
              </div>
            }
          >
            {/* Crisp page canvas container */}
            <div className="relative bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden mb-6">
              <Page
                pageNumber={currentPage}
                width={renderedPageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <div
                    style={{ width: renderedPageWidth, height: renderedPageWidth * 1.3 }}
                    className="bg-white flex flex-col items-center justify-center gap-2"
                  >
                    <Loader2 className="w-6 h-6 text-[#7f1e23] animate-spin" />
                    <span className="text-[11px] text-[#737373]">
                      Loading Page {currentPage}...
                    </span>
                  </div>
                }
              />
            </div>
          </Document>
        )}

        {/* Floating page-turn footer */}
        {numPages && numPages > 1 && !isFetchingBinary && !fetchError && !parseError && (
          <div className="sticky bottom-3 z-20 flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-black/5 mt-auto mb-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-black disabled:opacity-30 transition-colors"
              title="Previous page (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold text-black select-none">
              Page {currentPage} of {numPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= numPages}
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-black disabled:opacity-30 transition-colors"
              title="Next page (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomPagePdfViewer;
