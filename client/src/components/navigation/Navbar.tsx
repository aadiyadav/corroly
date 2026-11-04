"use client";

import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { getRepoSlug } from "@/lib/slugs";
import {
  openDiscoveryModal,
  openCreateRepoModal,
  setActiveWorkspaceView,
} from "@/store/slices/uiSlice";
import { setActiveRepositoryId } from "@/store/slices/repositorySlice";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { logout } from "@/store/slices/authSlice";
import {
  Search,
  Plus,
  ChevronDown,
  User as UserIcon,
  LogOut,
  FolderOpen,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ConfirmLogoutModal } from "@/components/ui/ConfirmLogoutModal";

interface NavbarProps {
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { repositories, activeRepositoryId } = useAppSelector(
    (state) => state.repository
  );

  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const activeRepo = repositories.find((r) => r.id === activeRepositoryId);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.post("/auth/logout");
    } catch {}
    dispatch(logout());
    dispatch(setActiveWorkspaceView("repositories"));
    setIsUserMenuOpen(false);
    setIsLogoutModalOpen(false);
    setIsLoggingOut(false);
    router.replace("/");
  };

  return (
    <header className="w-full bg-transparent z-30">
      <nav className="w-full px-4 sm:px-8 md:px-10 py-2 flex items-center justify-between bg-transparent border-none select-none">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link
            href={isAuthenticated ? "/repositories" : "/"}
            className="flex items-center group transition-transform hover:scale-105"
          >
            <Logo className="w-16 h-16" />
          </Link>

          {/* Active Workspace Selector */}
          {isAuthenticated && (
            <div className="relative ml-1 sm:ml-2">
              <button
                type="button"
                onClick={() => {
                  setIsRepoDropdownOpen(!isRepoDropdownOpen);
                  setIsUserMenuOpen(false);
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#f5f5f5] hover:bg-[#eaeaea] text-xs font-medium text-black shadow-sm transition-all duration-150"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#7f1e23]" />
                <span className="truncate">
                  {activeRepo ? activeRepo.name : "Select Workspace"}
                </span>
                <ChevronDown className="w-3 h-3 text-[#737373]" />
              </button>

              {/* Workspace Dropdown */}
              {isRepoDropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white shadow-lg p-2 z-50 flex flex-col gap-1 transition-all">
                  <div className="text-[11px] font-semibold text-[#737373] px-3 py-1.5 uppercase tracking-wider">
                    Workspaces
                  </div>

                  {repositories.length === 0 ? (
                    <div className="text-xs text-[#737373] px-3 py-2">
                      No repositories yet
                    </div>
                  ) : (
                    repositories.map((repo) => (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => {
                          dispatch(setActiveRepositoryId(repo.id));
                          dispatch(setActiveWorkspaceView("workspace"));
                          setIsRepoDropdownOpen(false);
                          router.push(`/${getRepoSlug(repo)}`);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          repo.id === activeRepositoryId
                            ? "bg-[#ffd4a5] font-semibold text-black"
                            : "hover:bg-[#f5f5f5] text-black"
                        }`}
                      >
                        <span className="truncate">{repo.name}</span>
                        <span className="text-[10px] text-[#737373]">
                          {repo.documentCount} docs
                        </span>
                      </button>
                    ))
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsRepoDropdownOpen(false);
                      dispatch(openCreateRepoModal());
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#7f1e23] hover:bg-[#ffd4a5]/40 flex items-center gap-2 mt-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#7f1e23]" />
                    <span>New Workspace</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => dispatch(openDiscoveryModal())}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ffd4a5] hover:bg-[#ffd4a5]/80 text-black text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Search className="w-3.5 h-3.5 text-black" />
                <span>Discover Papers</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(!isUserMenuOpen);
                    setIsRepoDropdownOpen(false);
                  }}
                  className="w-8 h-8 rounded-full bg-[#f5f5f5] hover:bg-[#eaeaea] text-black flex items-center justify-center shadow-sm text-xs font-bold transition-all"
                  title={user?.name || "Account"}
                >
                  {user?.name ? user.name[0].toUpperCase() : <UserIcon className="w-4 h-4 text-[#737373]" />}
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white shadow-lg p-2 z-50 flex flex-col gap-1 transition-all">
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-black truncate">
                        {user?.name}
                      </p>
                      <p className="text-[11px] text-[#737373] truncate">
                        {user?.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsLogoutModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#7f1e23] hover:bg-[#ffd4a5]/40 flex items-center gap-2 transition-colors font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5 text-[#7f1e23]" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth || (() => router.push("/login"))}
              className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl border border-black/15 bg-white hover:bg-[#f5f5f5] text-black text-xs sm:text-sm font-medium shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              Get Started
            </button>
          )}
        </div>
      </nav>

      {/* Confirm Logout Modal */}
      <ConfirmLogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
      />
    </header>
  );
};
