"use client";

import React, { useEffect } from "react";
import { X, LogOut, Loader2 } from "lucide-react";

export interface ConfirmLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export const ConfirmLogoutModal: React.FC<ConfirmLogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 relative transition-all border border-black/10 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#737373] hover:text-black hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Title */}
        <h3 className="text-xl font-bold text-black tracking-tight mb-4 pr-8">
          Log Out
        </h3>

        {/* 2. Subtitle */}
        <p className="text-sm font-medium text-black mb-2.5 leading-snug">
          Are you sure you want to log out?
        </p>

        {/* 3. Description */}
        <p className="text-xs text-black leading-relaxed mb-6">
          You will need to sign back in with your credentials to access your repositories and workspace discussions.
        </p>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-black/10 text-xs font-semibold text-black hover:bg-zinc-100 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="px-5 py-2 rounded-full bg-[#7f1e23] hover:bg-[#63161a] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Logging out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

