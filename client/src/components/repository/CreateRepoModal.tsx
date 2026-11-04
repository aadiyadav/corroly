"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import { addRepository } from "@/store/slices/repositorySlice";
import { closeCreateRepoModal, setActiveWorkspaceView } from "@/store/slices/uiSlice";
import { getRepoSlug } from "@/lib/slugs";
import { api } from "@/lib/api";
import { X, Loader2 } from "lucide-react";

const PALETTE_OPTIONS = [
  "#7f1e23", // Primary Crimson
  "#ffd4a5", // Warm Peach
  "#737373", // Muted Gray
  "#000000", // Deep Black
];

export const CreateRepoModal: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isCreateRepoModalOpen } = useAppSelector((state) => state.ui);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(PALETTE_OPTIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isCreateRepoModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await api.post("/repos", {
        name: name.trim(),
        description: description.trim() || undefined,
        colorTag: selectedColor,
      });

      const newRepo = response.data.data;
      dispatch(addRepository(newRepo));
      dispatch(setActiveWorkspaceView("workspace"));
      setName("");
      setDescription("");
      dispatch(closeCreateRepoModal());
      router.push(`/${getRepoSlug(newRepo)}`);
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Failed to create workspace. Please try again.";
      setErrorMsg(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-7 relative transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => dispatch(closeCreateRepoModal())}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f5f5f5] hover:bg-[#eaeaea] text-[#737373] hover:text-black flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-black tracking-tight">
            Create a Repository Workspace
          </h2>
          <p className="text-xs text-[#737373] mt-1">
            Workspaces isolate your indexed academic papers, vector embeddings, and synthesis chats.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-[#ffd4a5]/40 text-[#7f1e23] text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Workspace Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-1.5">
              Repository Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Quantum Computing & QEC"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-[#f5f5f5] rounded-2xl text-xs text-black placeholder-[#737373] outline-none transition-colors focus:bg-[#ebebeb]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Primary research goals, target journals, or focus topics..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-[#f5f5f5] rounded-2xl text-xs text-black placeholder-[#737373] outline-none transition-colors focus:bg-[#ebebeb] resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2">
              Workspace Color Tag
            </label>
            <div className="flex items-center gap-3">
              {PALETTE_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-6 h-6 rounded-full shadow-sm transition-transform ${
                    selectedColor === color ? "scale-125 ring-2 ring-offset-2 ring-black" : "hover:scale-110"
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="mt-2 w-full py-3 rounded-2xl bg-[#7f1e23] hover:bg-[#7f1e23]/90 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              "Create Repository"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
