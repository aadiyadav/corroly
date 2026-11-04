"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setRepositories,
  setRepoLoading,
  setActiveRepositoryId,
} from "@/store/slices/repositorySlice";
import { setActiveWorkspaceView } from "@/store/slices/uiSlice";
import { setConversations } from "@/store/slices/chatSlice";
import { api } from "@/lib/api";
import { WorkspaceSidebar } from "@/components/navigation/WorkspaceSidebar";
import { RepositoriesDashboard } from "@/components/repository/RepositoriesDashboard";
import { AuthModal } from "@/components/auth/AuthModal";
import { DiscoveryModal } from "@/components/discovery/DiscoveryModal";
import { CreateRepoModal } from "@/components/repository/CreateRepoModal";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function RepositoriesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);
  const { repositories, isLoading: isRepoLoading } = useAppSelector(
    (state) => state.repository
  );

  // Redirect to home landing page if not authenticated once auth check resolves
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace("/");
    }
  }, [isInitialized, isAuthenticated, router]);

  // Set active repository to null and record as valid URL
  useEffect(() => {
    dispatch(setActiveRepositoryId(null));
    dispatch(setActiveWorkspaceView("repositories"));
    dispatch(setConversations([]));

    if (typeof window !== "undefined") {
      sessionStorage.setItem("last_valid_url", "/repositories");
    }
  }, [dispatch]);

  // Load repositories when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    const fetchRepos = async () => {
      dispatch(setRepoLoading(true));
      try {
        const res = await api.get("/repos");
        if (isMounted) {
          dispatch(setRepositories(res.data?.data || []));
        }
      } catch (err) {
        console.error("Failed to load repositories", err);
      } finally {
        if (isMounted) dispatch(setRepoLoading(false));
      }
    };

    fetchRepos();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, dispatch]);

  // While restoring session on page refresh, show dedicated workspace loader
  if (!isInitialized) {
    return (
      <div className="h-screen w-screen bg-white p-4 flex items-center justify-center selection:bg-[#ffd4a5] selection:text-black">
        <div className="w-full h-full max-w-md max-h-[320px] bg-zinc-50 rounded-3xl border border-black/10 shadow-xl flex flex-col items-center justify-center p-8">
          <div className="mb-4 animate-pulse">
            <Logo className="w-12 h-12" size={48} />
          </div>
          <p className="text-xs font-semibold text-black tracking-tight">
            Loading Repositories...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated fallback while router redirect runs
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen w-screen p-1.5 sm:p-2 md:p-4 bg-white flex text-black overflow-hidden gap-0 md:gap-3 selection:bg-[#ffd4a5] selection:text-black">
      {/* Global Modals */}
      <AuthModal />
      <DiscoveryModal />
      <CreateRepoModal />

      {/* Sidebar: sits on the page background, with no borders or bg */}
      <WorkspaceSidebar />

      {/* Main Content Stage: Repositories Dashboard inside a bordered dotted bg box */}
      <main className="flex-1 h-full min-w-0 flex flex-col bg-zinc-50 textured-dot-bg rounded-2xl md:rounded-[28px] border border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden relative">
        <RepositoriesDashboard />
      </main>
    </div>
  );
}
