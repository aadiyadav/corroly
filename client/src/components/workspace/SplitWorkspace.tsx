"use client";

import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { toggleMobileSidebar } from "@/store/slices/uiSlice";
import { RepoSidebar } from "@/components/repository/RepoSidebar";
import { PdfReader } from "@/components/reader/PdfReader";
import { ChatConsole } from "@/components/chat/ChatConsole";
import { BookOpen, MessageSquare, Layers, Menu } from "lucide-react";

export const SplitWorkspace: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isReaderOpen } = useAppSelector((state) => state.ui);
  const [mobileTab, setMobileTab] = useState<"study" | "chat">("study");

  return (
    <div className="w-full h-full p-2.5 sm:p-3 md:p-4 flex flex-col min-h-0 overflow-hidden">
      {/* Mobile Top Bar (< md): Hamburger Button & Tab Switcher */}
      <div className="md:hidden flex items-center gap-2 mb-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => dispatch(toggleMobileSidebar())}
          title="Open menu"
          className="p-2 rounded-xl bg-white border border-black/10 text-black hover:bg-zinc-100 shadow-sm transition-all active:scale-95 flex items-center justify-center shrink-0"
        >
          <Menu className="w-4 h-4 text-black" />
        </button>

        {/* Mobile Tab Switcher */}
        <div className="flex-1 flex bg-[#f5f5f5] p-1 rounded-2xl shadow-inner min-w-0">
          <button
            type="button"
            onClick={() => setMobileTab("study")}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all truncate ${
              mobileTab === "study"
                ? "bg-[#7f1e23] text-white shadow-sm"
                : "text-[#737373]"
            }`}
          >
            {isReaderOpen ? <BookOpen className="w-3.5 h-3.5 shrink-0" /> : <Layers className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{isReaderOpen ? "PDF Reader" : "Papers"}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("chat")}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all truncate ${
              mobileTab === "chat"
                ? "bg-[#7f1e23] text-white shadow-sm"
                : "text-[#737373]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Conversation</span>
          </button>
        </div>
      </div>

      {/* Responsive Workspace Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 h-full min-h-0 flex-1 overflow-hidden">
        {/* Left Pane: Study / Reader / Repo Sidebar */}
        <div
          className={`h-full min-h-0 overflow-hidden md:col-span-6 ${
            mobileTab === "chat" ? "hidden md:block" : "block"
          }`}
        >
          {isReaderOpen ? <PdfReader /> : <RepoSidebar />}
        </div>

        {/* Right Pane: Grounded Chat Console */}
        <div
          className={`h-full min-h-0 overflow-hidden md:col-span-6 ${
            mobileTab === "study" ? "hidden md:block" : "block"
          }`}
        >
          <ChatConsole />
        </div>
      </div>
    </div>
  );
};
