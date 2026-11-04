"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setConversations,
  setActiveConversationId,
  addConversation,
  setMessages,
  appendMessage,
  startStreaming,
  appendStreamToken,
  setStreamCitations,
  finishStreaming,
  Citation,
} from "@/store/slices/chatSlice";
import { openDiscoveryModal, jumpToCitation } from "@/store/slices/uiSlice";
import { addDocument, updateJobProgress } from "@/store/slices/documentSlice";
import { api, getValidAccessToken } from "@/lib/api";
import {
  Send,
  Plus,
  MessageSquare,
  Bot,
  User as UserIcon,
  BookOpen,
  Loader2,
  Bookmark,
  Search,
  UploadCloud,
  ArrowRight,
  Paperclip,
} from "lucide-react";

export const ChatConsole: React.FC = () => {
  const dispatch = useAppDispatch();
  const { activeRepositoryId } = useAppSelector((state) => state.repository);
  const { documents } = useAppSelector((state) => state.document);
  const {
    conversations,
    activeConversationId,
    messages,
    selectedDocIdsByThread,
    isStreaming,
    streamingContent,
    streamingCitations,
  } = useAppSelector((state) => state.chat);

  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to strip raw [Doc: ..., Page: ...] citation tags from assistant messages
  const cleanAssistantContent = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\.\s*\[Doc:[^\]]+?\]\.?/gi, ".")
      .replace(/\s*\[Doc:[^\]]+?\]\.?/gi, (match) => (match.endsWith(".") ? "." : ""));
  };

  // Deduplicate citation chips so each paper is tagged at most once
  const getUniqueDocCitations = (citations: Citation[]): Citation[] => {
    const seen = new Set<string>();
    const unique: Citation[] = [];
    for (const c of citations) {
      const key = (c.docId || c.docTitle).toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
    }
    return unique;
  };

  // Auto-scroll to bottom on new messages or streaming tokens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Load conversations for active repository
  useEffect(() => {
    if (!activeRepositoryId) return;

    let isMounted = true;
    const fetchConversations = async () => {
      try {
        const response = await api.get(`/repos/${activeRepositoryId}/chats`);
        if (isMounted) {
          dispatch(setConversations(response.data?.data || []));
        }
      } catch (err) {
        console.error("Failed to load conversations", err);
      }
    };

    fetchConversations();

    return () => {
      isMounted = false;
    };
  }, [activeRepositoryId, dispatch]);

  // Load message history for active conversation
  useEffect(() => {
    if (!activeRepositoryId || !activeConversationId) return;

    let isMounted = true;
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const response = await api.get(
          `/repos/${activeRepositoryId}/chats/${activeConversationId}/messages`
        );
        if (isMounted) {
          dispatch(setMessages(response.data?.data || []));
        }
      } catch (err) {
        console.error("Failed to load message history", err);
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    };

    fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [activeRepositoryId, activeConversationId, dispatch]);

  // Create new conversation thread
  const handleCreateNewThread = async () => {
    if (!activeRepositoryId) return;
    try {
      const response = await api.post(`/repos/${activeRepositoryId}/chats`, {
        title: "New Discussion",
      });
      if (response.data?.data) {
        dispatch(addConversation(response.data.data));
      }
    } catch (err) {
      console.error("Failed to create conversation", err);
    }
  };

  // Upload local PDF directly into repository and track progress
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRepositoryId) return;

    setIsUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.pdf$/i, ""));

      const res = await api.post(
        `/repos/${activeRepositoryId}/documents/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (res.data?.data) {
        const { document: newDoc, jobId } = res.data.data;
        dispatch(addDocument(newDoc));
        dispatch(
          updateJobProgress({
            jobId,
            docId: newDoc.id,
            percent: 15,
            stage: "PROCESSING",
            isCompleted: false,
            isError: false,
          })
        );
      }
    } catch (err) {
      console.error("Failed to upload local PDF", err);
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle citation badge click -> jump to page in reader
  const handleCitationClick = (citation: {
    docId: string;
    docTitle: string;
    pageNumber: number;
    citationId: string;
  }) => {
    const targetDoc =
      documents.find((d) => d.id === citation.docId) ||
      documents.find((d) => d.title.toLowerCase() === citation.docTitle.toLowerCase()) ||
      documents.find(
        (d) =>
          d.title.toLowerCase().includes(citation.docTitle.toLowerCase()) ||
          citation.docTitle.toLowerCase().includes(d.title.toLowerCase())
      );
    if (targetDoc) {
      dispatch(
        jumpToCitation({
          doc: targetDoc,
          page: citation.pageNumber,
          citationId: citation.citationId,
        })
      );
    }
  };

  // Submit grounded prompt to SSE stream endpoint
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isSending || isStreaming || !activeRepositoryId) return;

    let targetConvId = activeConversationId;

    // Automatically create discussion if none exists
    if (!targetConvId) {
      try {
        const titleSnippet =
          prompt.trim().slice(0, 30) + (prompt.trim().length > 30 ? "..." : "");
        const newChatRes = await api.post(`/repos/${activeRepositoryId}/chats`, {
          title: titleSnippet || "New Discussion",
        });
        if (newChatRes.data?.data) {
          dispatch(addConversation(newChatRes.data.data));
          targetConvId = newChatRes.data.data.id;
        }
      } catch (err) {
        console.error("Failed to initialize conversation for prompt", err);
        return;
      }
    }

    if (!targetConvId) return;

    const userPrompt = prompt.trim();
    setPrompt("");
    setIsSending(true);

    const tempUserMsg = {
      id: crypto.randomUUID(),
      conversationId: targetConvId,
      role: "USER" as const,
      content: userPrompt,
      createdAt: new Date().toISOString(),
    };
    dispatch(appendMessage(tempUserMsg));
    dispatch(startStreaming());

    try {
      const token = await getValidAccessToken();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

      // Calculate targeted documents for this discussion
      const availableDocs = documents.filter((d) => d.status === "INDEXED");
      const allDocIds = availableDocs.map((d) => d.id);
      const targetDocIds = targetConvId
        ? (selectedDocIdsByThread[targetConvId] ?? allDocIds)
        : allDocIds;

      const response = await fetch(
        `${apiUrl}/repos/${activeRepositoryId}/chats/${targetConvId}/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            prompt: userPrompt,
            documentIds: targetDocIds,
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Streaming connection failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const blocks = streamBuffer.split(/\r?\n\r?\n/);
        streamBuffer = blocks.pop() || "";

        for (const block of blocks) {
          const lines = block.split(/\r?\n/);
          let eventType = "";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.slice(5).trim();
            }
          }

          if (eventType === "token" && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.token) {
                dispatch(appendStreamToken(parsed.token));
              }
            } catch {}
          } else if (eventType === "citations" && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.citations) {
                dispatch(setStreamCitations(parsed.citations));
              }
            } catch {}
          }
        }
      }

      dispatch(finishStreaming({ messageId: crypto.randomUUID() }));
    } catch (err) {
      console.error("Error during streaming", err);
      dispatch(
        appendStreamToken("\n\n*Error: Connection to RAG engine interrupted.*")
      );
      dispatch(finishStreaming({ messageId: crypto.randomUUID() }));
    } finally {
      setIsSending(false);
    }
  };

  const activeThread = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-3xl border border-black/10 shadow-sm overflow-hidden selection:bg-[#ffd4a5] selection:text-black">
      {/* Hidden File Input for PDF Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handlePdfUpload}
        className="hidden"
      />

      {/* Console Top Bar: Active Thread Title & New Thread Trigger */}
      <div className="px-5 py-3 bg-white flex items-center justify-between shadow-sm z-10 border-b border-[#f5f5f5]">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-[#7f1e23] flex-shrink-0" />
          <h2 className="text-xs font-bold text-black truncate tracking-tight">
            {activeThread ? activeThread.title : "Research Discussion"}
          </h2>
        </div>

        <button
          type="button"
          onClick={handleCreateNewThread}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffd4a5] hover:bg-[#ffd4a5]/80 text-xs font-semibold text-[#7f1e23] transition-all shadow-sm active:scale-95"
          title="New Discussion Thread"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="sm:block hidden">New Thread</span>
        </button>
      </div>

      {/* Message History Container */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {isLoadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#7f1e23]" />
          </div>
        ) : messages.length === 0 && !isStreaming ? (
          /* Dual Initiator Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto my-auto">
            <div className="w-12 h-12 rounded-2xl bg-[#ffd4a5] flex items-center justify-center text-[#7f1e23] mb-3 shadow-sm">
              <Bot className="w-6 h-6 text-[#7f1e23]" />
            </div>
            <h3 className="text-base font-bold text-black tracking-tight mb-1">
              Start Your Research Synthesis
            </h3>
            <p className="text-xs text-[#737373] max-w-md mb-6 leading-relaxed">
              Synthesize academic literature with zero hallucination. Initiate your discussion by searching open literature or uploading your local preprints.
            </p>

            {/* Dual Initiating Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
              {/* Option A: Search Academic Papers */}
              <div
                onClick={() => dispatch(openDiscoveryModal())}
                className="p-4 rounded-2xl bg-[#fafafa] hover:bg-[#ffd4a5]/15 border border-[#eeeeee] hover:border-[#ffd4a5] cursor-pointer transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#7f1e23] group-hover:scale-110 transition-transform">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-black">
                      Search Literature
                    </span>
                  </div>
                  <p className="text-[11px] text-[#737373] leading-relaxed mb-3">
                    Search over 200M+ research papers across ArXiv and Semantic Scholar to import into this workspace.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7f1e23] group-hover:translate-x-0.5 transition-transform">
                  <span>Search Papers</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>

              {/* Option B: Upload Local PDF */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-2xl bg-[#fafafa] hover:bg-[#ffd4a5]/15 border border-[#eeeeee] hover:border-[#ffd4a5] cursor-pointer transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#7f1e23] group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-black">
                      Upload Own PDFs
                    </span>
                  </div>
                  <p className="text-[11px] text-[#737373] leading-relaxed mb-3">
                    Upload your own preprint or journal PDFs. Text will be extracted, chunked, and indexed automatically.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7f1e23] group-hover:translate-x-0.5 transition-transform">
                  <span>{isUploadingPdf ? "Uploading..." : "Upload PDF"}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-1.5 ${
                  msg.role === "USER" ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 px-1">
                  {msg.role === "USER" ? (
                    <span className="text-[10px] font-semibold text-[#737373] flex items-center gap-1">
                      <UserIcon className="w-3 h-3" /> You
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#7f1e23] flex items-center gap-1">
                      <Bot className="w-3 h-3 text-[#7f1e23]" /> Corroly Assistant
                    </span>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "USER"
                      ? "bg-[#7f1e23] text-white rounded-br-md shadow-sm"
                      : "bg-muted/15 text-black rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.role === "ASSISTANT" ? cleanAssistantContent(msg.content) : msg.content}
                </div>

                {/* Grounded Citation Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 max-w-[85%]">
                    {getUniqueDocCitations(msg.citations).map((c, idx) => (
                      <button
                        key={`${c.citationId}-${idx}`}
                        type="button"
                        onClick={() => handleCitationClick(c)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffd4a5] hover:bg-[#ffd4a5]/80 text-black text-[10px] font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
                        title={c.snippet || "Click to jump to citation page"}
                      >
                        <Bookmark className="w-3 h-3 text-[#7f1e23]" />
                        <span className="truncate max-w-[140px]">{c.docTitle}</span>
                        <span className="text-[#7f1e23] font-bold">p.{c.pageNumber}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* In-Flight Streaming Message */}
            {isStreaming && (
              <div className="flex flex-col gap-1.5 items-start">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-[10px] font-semibold text-[#7f1e23] flex items-center gap-1">
                    <Bot className="w-3 h-3 text-[#7f1e23]" /> Synthesizing...
                  </span>
                </div>
                <div className="p-4 rounded-3xl rounded-bl-md bg-[#f5f5f5] text-black max-w-[85%] text-xs leading-relaxed whitespace-pre-wrap shadow-sm">
                  {cleanAssistantContent(streamingContent)}
                  <span className="typewriter-dot w-2 h-2 rounded-full bg-[#7f1e23] inline-block ml-1" />
                </div>

                {/* In-Flight Citations */}
                {streamingCitations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 max-w-[85%]">
                    {getUniqueDocCitations(streamingCitations).map((c, idx) => (
                      <button
                        key={`stream-${idx}`}
                        type="button"
                        onClick={() => handleCitationClick(c)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffd4a5] hover:bg-[#ffd4a5]/80 text-black text-[10px] font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
                      >
                        <Bookmark className="w-3 h-3 text-[#7f1e23]" />
                        <span className="truncate max-w-[140px]">{c.docTitle}</span>
                        <span className="text-[#7f1e23] font-bold">p.{c.pageNumber}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Zero-Border Input Bar */}
      <div className="p-4 bg-white shadow-sm z-10 border-t border-[#f5f5f5]">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 bg-[#f5f5f5] rounded-full px-3 py-1.5 shadow-inner"
        >
          {/* Quick Add Papers: Search & Upload */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => dispatch(openDiscoveryModal())}
              title="Search Literature to Add"
              className="p-1.5 rounded-full hover:bg-white text-[#737373] hover:text-[#7f1e23] transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload PDF to Add"
              disabled={isUploadingPdf}
              className="p-1.5 rounded-full hover:bg-white text-[#737373] hover:text-[#7f1e23] transition-colors"
            >
              {isUploadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7f1e23]" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <input
            type="text"
            placeholder="Ask questions across your selected research papers..."
            value={prompt}
            disabled={isStreaming}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1 py-1.5 bg-transparent text-xs text-black placeholder-[#737373] outline-none"
          />

          <button
            type="submit"
            disabled={!prompt.trim() || isStreaming || isSending}
            className="w-8 h-8 rounded-full bg-[#7f1e23] hover:bg-[#7f1e23]/90 text-white flex items-center justify-center shadow-sm transition-all disabled:opacity-40 active:scale-95 flex-shrink-0"
            title="Send Message"
          >
            {isSending || isStreaming ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
