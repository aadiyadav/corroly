"use client";

import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { setCredentials, setAuthLoading } from "@/store/slices/authSlice";
import { closeAuthModal, setActiveWorkspaceView } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { X, Lock, Mail, User as UserIcon, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";

export const AuthModal: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthModalOpen } = useAppSelector((state) => state.ui);
  const { isLoading } = useAppSelector((state) => state.auth);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Client-side quick validations for dedicated messaging
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (mode === "register") {
      if (!name.trim()) {
        setErrorMsg("Full Name is required.");
        return;
      }
      if (password.length < 8) {
        setErrorMsg("Password must be at least 8 characters long.");
        return;
      }
    }

    dispatch(setAuthLoading(true));

    try {
      if (mode === "login") {
        const response = await api.post("/auth/login", { email: email.trim(), password });
        const { user, accessToken } = response.data.data;
        dispatch(setCredentials({ user, accessToken }));
        dispatch(setActiveWorkspaceView("repositories"));
        dispatch(closeAuthModal());
        router.push("/repositories");
      } else {
        const response = await api.post("/auth/register", { name: name.trim(), email: email.trim(), password });
        const { user, accessToken } = response.data.data;
        dispatch(setCredentials({ user, accessToken }));
        dispatch(setActiveWorkspaceView("repositories"));
        dispatch(closeAuthModal());
        router.push("/repositories");
      }
    } catch (err: any) {
      const errorObj = err?.response?.data?.error;
      if (errorObj?.details && Array.isArray(errorObj.details) && errorObj.details.length > 0) {
        // Extract Zod validation messages specifically
        const detailMessages = errorObj.details.map((d: any) => d.message).filter(Boolean);
        setErrorMsg(detailMessages.length > 0 ? detailMessages.join(". ") : errorObj.message || "Validation failed.");
      } else if (errorObj?.message) {
        setErrorMsg(errorObj.message);
      } else if (err?.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else if (err?.message && !err.response) {
        setErrorMsg("Unable to reach the server. Please check your network connection.");
      } else {
        setErrorMsg("Authentication failed. Please verify your credentials.");
      }
    } finally {
      dispatch(setAuthLoading(false));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-7 relative transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => dispatch(closeAuthModal())}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f5f5f5] hover:bg-[#eaeaea] text-[#737373] hover:text-black flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-black tracking-tight">
            {mode === "login" ? "Welcome Back!" : "Create Account."}
          </h2>
          <p className="text-xs text-[#737373] mt-1">
            {mode === "login"
              ? "Access your grounded research repositories and syntheses."
              : "Start discovering and synthesizing academic papers with zero hallucinations."}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-accent/70 p-1 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
              setShowPassword(false);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all text-primary ${
              mode === "login"
                ? "bg-white shadow-sm"
                : "hover:text-black"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
              setShowPassword(false);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all text-primary ${
              mode === "register"
                ? "bg-white shadow-sm"
                : "hover:text-black"
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-[#ffd4a5]/40 border border-[#ffd4a5] text-[#7f1e23] text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#7f1e23] mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "register" && (
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#737373] absolute left-4 top-3.5" />
              <input
                type="text"
                required
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#f5f5f5] rounded-2xl text-xs text-black placeholder-[#737373] outline-none transition-colors focus:bg-[#ebebeb]"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="w-4 h-4 text-[#737373] absolute left-4 top-3.5" />
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#f5f5f5] rounded-2xl text-xs text-black placeholder-[#737373] outline-none transition-colors focus:bg-[#ebebeb]"
            />
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 text-[#737373] absolute left-4 top-3.5" />
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder={mode === "register" ? "Password (min 8 characters)" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-11 py-3 bg-[#f5f5f5] rounded-2xl text-xs text-black placeholder-[#737373] outline-none transition-colors focus:bg-[#ebebeb]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3.5 top-3.5 text-[#737373] hover:text-black transition-colors focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-[#7f1e23]" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full py-3 rounded-2xl bg-[#7f1e23] hover:bg-[#7f1e23]/90 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : mode === "login" ? (
              "Sign In to Corroly"
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
