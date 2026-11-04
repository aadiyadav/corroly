"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setRepositories,
  setRepoLoading,
  setActiveRepositoryId,
} from "@/store/slices/repositorySlice";
import { setActiveWorkspaceView } from "@/store/slices/uiSlice";
import { findRepoBySlugOrName } from "@/lib/slugs";
import { api } from "@/lib/api";
import { WorkspaceSidebar } from "@/components/navigation/WorkspaceSidebar";
import { SplitWorkspace } from "@/components/workspace/SplitWorkspace";
import { AuthModal } from "@/components/auth/AuthModal";
import { DiscoveryModal } from "@/components/discovery/DiscoveryModal";
import { CreateRepoModal } from "@/components/repository/CreateRepoModal";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function WorkspaceSlugPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const routeParams = useParams();
  const workspaceSlug = (routeParams?.workspaceSlug as string) || "";

  const { isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);
  const { repositories, isLoading: isRepoLoading, activeRepositoryId } = useAppSelector(
    (state) => state.repository
  );

  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  // Redirect to home landing page if not authenticated once auth check resolves
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace("/");
    }
  }, [isInitialized, isAuthenticated, router]);

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
        if (isMounted) {
          dispatch(setRepoLoading(false));
          setHasAttemptedFetch(true);
        }
      }
    };

    fetchRepos();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, dispatch]);

  // Match the repository by slug or redirect back if invalid
  useEffect(() => {
    if (!isAuthenticated || (!hasAttemptedFetch && repositories.length === 0)) {
      return;
    }

    const matchedRepo = findRepoBySlugOrName(repositories, workspaceSlug);

    if (matchedRepo) {
      // Valid workspace URL
      if (activeRepositoryId !== matchedRepo.id) {
        dispatch(setActiveRepositoryId(matchedRepo.id));
      }
      dispatch(setActiveWorkspaceView("workspace"));

      if (typeof window !== "undefined") {
        sessionStorage.setItem("last_valid_url", window.location.pathname);
      }
    } else if (hasAttemptedFetch || !isRepoLoading) {
      // Invalid URL entered (e.g. /abcd): redirect back to previous valid URL
      const previousUrl =
        typeof window !== "undefined" ? sessionStorage.getItem("last_valid_url") : null;
      const target =
        previousUrl && previousUrl !== window.location.pathname
          ? previousUrl
          : "/repositories";
      router.replace(target);
    }
  }, [
    workspaceSlug,
    repositories,
    isRepoLoading,
    hasAttemptedFetch,
    isAuthenticated,
    activeRepositoryId,
    dispatch,
    router,
  ]);

  // While restoring session or matching repository, show dedicated workspace loader
  if (!isInitialized || (!hasAttemptedFetch && repositories.length === 0)) {
    return (
      <div className="h-screen w-screen bg-white p-4 flex items-center justify-center selection:bg-[#ffd4a5] selection:text-black">
        <div className="w-full h-full max-w-md max-h-[320px] bg-zinc-50 rounded-3xl border border-black/10 shadow-xl flex flex-col items-center justify-center p-8">
          <div className="mb-4 animate-pulse">
            <Logo className="w-16 h-16" />
          </div>
          <p className="text-xs font-semibold text-black tracking-tight">
            Opening Workspace...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated fallback while router redirect runs
  if (!isAuthenticated) {
    return null;
  }

  const matchedRepo = findRepoBySlugOrName(repositories, workspaceSlug);
  if (!matchedRepo) {
    return (
      <div className="h-screen w-screen bg-white p-4 flex items-center justify-center">
        <div className="w-full h-full max-w-md max-h-[320px] bg-zinc-50 rounded-3xl border border-black/10 shadow-xl flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#7f1e23]" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen p-1.5 sm:p-2 md:p-4 bg-white flex text-black overflow-hidden gap-0 md:gap-3 selection:bg-[#ffd4a5] selection:text-black">
      {/* Global Modals */}
      <AuthModal />
      <DiscoveryModal />
      <CreateRepoModal />

      {/* Sidebar: sits on the page background, with no borders or bg */}
      <WorkspaceSidebar />

      {/* Main Content Stage: Active Workspace Split Viewer inside a bordered dotted bg box */}
      <main className="flex-1 h-full min-w-0 flex flex-col bg-zinc-50 textured-dot-bg rounded-2xl md:rounded-[28px] border border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden relative">
        <SplitWorkspace />
      </main>
    </div>
  );
}
