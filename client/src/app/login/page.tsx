"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import { setCredentials, setAuthLoading } from "@/store/slices/authSlice";
import { setActiveWorkspaceView } from "@/store/slices/uiSlice";
import { api } from "@/lib/api";
import { Logo } from "@/components/ui/Logo";
import loginBg from "@/assets/login-bg.webp";
import {
  Lock,
  Mail,
  User as UserIcon,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const { isAuthenticated, isInitialized, isLoading } = useAppSelector(
    (state) => state.auth
  );

  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already authenticated, redirect immediately to repositories
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace("/repositories");
    }
  }, [isInitialized, isAuthenticated, router]);

  // Sync mode if query parameter changes
  useEffect(() => {
    const queryMode = searchParams.get("mode");
    if (queryMode === "register" || queryMode === "login") {
      setMode(queryMode);
      setErrorMsg(null);
    }
  }, [searchParams]);

  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Client-side quick validations
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
        const response = await api.post("/auth/login", {
          email: email.trim(),
          password,
        });
        const { user, accessToken, refreshToken } = response.data.data;
        dispatch(setCredentials({ user, accessToken, refreshToken }));
        dispatch(setActiveWorkspaceView("repositories"));
        router.push("/repositories");
      } else {
        const response = await api.post("/auth/register", {
          name: name.trim(),
          email: email.trim(),
          password,
        });
        const { user, accessToken, refreshToken } = response.data.data;
        dispatch(setCredentials({ user, accessToken, refreshToken }));
        dispatch(setActiveWorkspaceView("repositories"));
        router.push("/repositories");
      }
    } catch (err: any) {
      const errorObj = err?.response?.data?.error;
      if (errorObj?.details && Array.isArray(errorObj.details) && errorObj.details.length > 0) {
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
    <div className="w-full max-w-md mx-auto flex flex-col justify-center">
      {/* Back to Home Link */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#737373] hover:text-black transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6">
        <Logo size={36} className="w-9 h-9 rounded-xl shadow-sm" />
        <span className="text-2xl font-bold tracking-tight text-black font-montserrat">
          Corroly
        </span>
      </div>

      {/* Heading & Subtitle */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">
          {mode === "login" ? "Welcome Back!" : "Create Account"}
        </h1>
        <p className="text-xs sm:text-sm text-[#737373] mt-1.5 leading-relaxed">
          {mode === "login"
            ? "Access your grounded research repositories and syntheses."
            : "Start discovering and synthesizing academic papers with zero hallucinations."}
        </p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-2xl bg-[#ffd4a5]/40 border border-[#ffd4a5] text-[#7f1e23] text-xs font-medium flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#7f1e23] mt-0.5" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {mode === "register" && (
          <div className="relative">
            <UserIcon className="w-4 h-4 text-[#737373] absolute left-4 top-4" />
            <input
              type="text"
              required
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-[#f5f5f5] rounded-2xl text-xs sm:text-sm text-black placeholder-[#737373] outline-none transition-colors focus:bg-[#ebebeb] border border-transparent focus:border-black/10"
            />
          </div>
        )}

        <div className="relative">
          <Mail className="w-4 h-4 text-[#737373] absolute left-4 top-4" />
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-[#f5f5f5] rounded-2xl text-xs sm:text-sm text-black placeholder-[#737373] outline-none transition-colors focus:bg-[#ebebeb] border border-transparent focus:border-black/10"
          />
        </div>

        <div className="relative">
          <Lock className="w-4 h-4 text-[#737373] absolute left-4 top-4" />
          <input
            type={showPassword ? "text" : "password"}
            required
            placeholder={mode === "register" ? "Password (min 8 characters)" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-11 pr-11 py-3.5 bg-[#f5f5f5] rounded-2xl text-xs sm:text-sm text-black placeholder-[#737373] outline-none transition-colors focus:bg-[#ebebeb] border border-transparent focus:border-black/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3.5 top-3.5 text-[#737373] hover:text-black transition-colors focus:outline-none p-1"
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
          className="mt-3 w-full py-3.5 rounded-2xl bg-[#7f1e23] hover:bg-[#7f1e23]/90 text-white text-xs sm:text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
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

      {/* Switch Mode Prompt */}
      <div className="mt-8 text-center text-xs text-[#737373]">
        {mode === "login" ? (
          <p>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMsg(null);
                setShowPassword(false);
              }}
              className="font-semibold text-[#7f1e23] hover:underline"
            >
              Register here
            </button>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg(null);
                setShowPassword(false);
              }}
              className="font-semibold text-[#7f1e23] hover:underline"
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full m-0 p-0 flex flex-col md:flex-row bg-white overflow-x-hidden">
      {/* Left Half: login-bg.webp inside assets folder (hidden on screens smaller than md) */}
      <div className="hidden md:block relative md:w-1/2 md:min-h-screen shrink-0 overflow-hidden bg-black select-none">
        <Image
          src={loginBg}
          alt="Corroly Background"
          fill
          priority
          className="object-cover object-center"
          sizes="50vw"
        />
        {/* Subtle decorative edge gradient for seamless blending */}
        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-black/10 pointer-events-none" />
      </div>

      {/* Right Half: Signin or Register Form (full width and height on < md) */}
      <div className="w-full md:w-1/2 min-h-screen flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-white overflow-y-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#7f1e23]" />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

