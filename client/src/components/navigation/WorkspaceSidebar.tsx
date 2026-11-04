"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  toggleSidebar,
  closeMobileSidebar,
  setActiveWorkspaceView,
  openCreateRepoModal,
} from "@/store/slices/uiSlice";
import {
  setActiveRepositoryId,
  Repository,
} from "@/store/slices/repositorySlice";
import {
  setActiveConversationId,
  addConversation,
  updateConversationInState,
  removeConversationFromState,
  Conversation,
} from "@/store/slices/chatSlice";
import { logout } from "@/store/slices/authSlice";
import { getRepoSlug } from "@/lib/slugs";
import { api } from "@/lib/api";
import { Logo } from "@/components/ui/Logo";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { ConfirmLogoutModal } from "@/components/ui/ConfirmLogoutModal";
import {
  BookOpen,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  ChevronDown,
  Trash2,
  Pencil,
  Check,
  X,
  LogOut,
  FolderPlus,
  Layers,
} from "lucide-react";

export const WorkspaceSidebar: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isSidebarCollapsed, isMobileSidebarOpen, activeWorkspaceView } = useAppSelector(
    (state) => state.ui
  );
  const { repositories, activeRepositoryId } = useAppSelector(
    (state) => state.repository
  );
  const { conversations, activeConversationId } = useAppSelector(
    (state) => state.chat
  );
  const { user } = useAppSelector((state) => state.auth);

  const [isMobile, setIsMobile] = useState(false);
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [threadToDelete, setThreadToDelete] = useState<Conversation | null>(null);
  const [isDeletingThread, setIsDeletingThread] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeRepo = repositories.find((r) => r.id === activeRepositoryId);

  // Track responsive screen size (breakpoint md = 768px)
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        dispatch(closeMobileSidebar());
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch]);

  // On desktop, follow isSidebarCollapsed. On mobile, the drawer is always expanded when open.
  const isCollapsed = !isMobile && isSidebarCollapsed;

  // Close repo dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsRepoDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle New Thread creation
  const handleCreateNewThread = async () => {
    if (!activeRepositoryId || !activeRepo) return;
    dispatch(closeMobileSidebar());
    try {
      const res = await api.post(`/repos/${activeRepositoryId}/chats`, {
        title: "New Discussion",
      });
      if (res.data?.data) {
        dispatch(addConversation(res.data.data));
        dispatch(setActiveConversationId(res.data.data.id));
        dispatch(setActiveWorkspaceView("workspace"));
        router.push(`/${getRepoSlug(activeRepo)}`);
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  // Handle thread rename
  const handleSaveRename = async (chatId: string) => {
    if (!editTitle.trim() || !activeRepositoryId) {
      setEditingChatId(null);
      return;
    }
    try {
      await api.patch(`/repos/${activeRepositoryId}/chats/${chatId}`, {
        title: editTitle.trim(),
      });
      dispatch(
        updateConversationInState({ id: chatId, title: editTitle.trim() })
      );
    } catch (err) {
      console.error("Failed to rename conversation:", err);
    } finally {
      setEditingChatId(null);
      setEditTitle("");
    }
  };

  // Handle confirmed thread deletion
  const handleConfirmDeleteThread = async () => {
    if (!threadToDelete || !activeRepositoryId) return;
    setIsDeletingThread(true);
    try {
      await api.delete(`/repos/${activeRepositoryId}/chats/${threadToDelete.id}`);
      dispatch(removeConversationFromState(threadToDelete.id));
      setThreadToDelete(null);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    } finally {
      setIsDeletingThread(false);
    }
  };

  // Handle confirmed logout
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.post("/auth/logout");
    } catch {
      // Clean dispatch regardless
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
      dispatch(logout());
      dispatch(setActiveRepositoryId(null));
      dispatch(setActiveWorkspaceView("repositories"));
      router.replace("/");
    }
  };

  // Chronological grouping of threads (Today, Previous 7 Days, Older)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groupThreads = () => {
    const today: Conversation[] = [];
    const pastWeek: Conversation[] = [];
    const older: Conversation[] = [];

    conversations.forEach((c) => {
      const updated = new Date(c.updatedAt || c.createdAt);
      if (updated >= todayStart) {
        today.push(c);
      } else if (updated >= weekStart) {
        pastWeek.push(c);
      } else {
        older.push(c);
      }
    });

    return { today, pastWeek, older };
  };

  const { today, pastWeek, older } = groupThreads();

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 md:hidden ${
          isMobileSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => dispatch(closeMobileSidebar())}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ease-in-out border-r border-[#ebebeb] md:relative md:inset-auto md:z-30 md:bg-transparent md:shadow-none md:border-none md:transition-all ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${
          isCollapsed ? "md:w-16" : "md:w-72"
        } flex flex-col justify-between select-none`}
      >
      {/* Top Header & Navigation Section */}
      <div className="flex flex-col min-h-0 flex-1">
        {/* Sidebar Brand Bar */}
        <div className="h-16 px-4 flex items-center justify-between">
          {!isCollapsed ? (
            <div className="flex items-center overflow-hidden">
              <Logo className="w-12 h-12" size={48} />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Logo className="w-9 h-9" size={36} />
            </div>
          )}

          {/* Desktop Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsRepoDropdownOpen(false);
              dispatch(toggleSidebar());
            }}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:flex p-2 rounded-lg text-[#737373] hover:text-black hover:bg-[#f0f0f0] transition-colors flex-shrink-0 ml-auto"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Drawer Close Button */}
          <button
            type="button"
            onClick={() => dispatch(closeMobileSidebar())}
            title="Close menu"
            className="md:hidden p-2 rounded-lg text-[#737373] hover:text-black hover:bg-[#f0f0f0] transition-colors flex-shrink-0 ml-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons: New Thread & Repositories Overview */}
        <div className="px-3 pt-1 pb-3 space-y-2">
          {/* New Thread Button */}
          <button
            type="button"
            onClick={handleCreateNewThread}
            disabled={!activeRepositoryId}
            title="Start new research discussion thread"
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[#ffd4a5] hover:bg-[#ffd4a5]/80 text-[#7f1e23] font-semibold text-xs shadow-sm transition-all active:scale-[0.98] ${
              !activeRepositoryId ? "opacity-50 cursor-not-allowed" : ""
            } ${isCollapsed ? "px-0" : "px-4"}`}
          >
            <Plus className="w-4 h-4 text-[#7f1e23]" />
            {!isCollapsed && <span>New Thread</span>}
          </button>

          {/* Repositories Overview Button */}
          <button
            type="button"
            onClick={() => {
              dispatch(setActiveRepositoryId(null));
              dispatch(setActiveWorkspaceView("repositories"));
              dispatch(closeMobileSidebar());
              router.push("/repositories");
            }}
            title="All Repositories Overview"
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl transition-all text-xs font-semibold shadow-sm active:scale-[0.98] ${
              !activeRepositoryId
                ? "bg-[#7f1e23] text-white"
                : "bg-white hover:bg-[#f5f5f5] text-black border border-[#e5e5e5]"
            } ${isCollapsed ? "px-0" : "px-4"}`}
          >
            <Layers
              className={`w-4 h-4 ${
                !activeRepositoryId
                  ? "text-white"
                  : "text-[#7f1e23]"
              }`}
            />
            {!isCollapsed && <span>Repositories Overview</span>}
          </button>
        </div>

        {/* Repository Switcher Accordion / Dropdown */}
        <div className="px-3 pb-3 relative" ref={dropdownRef}>
          {!isCollapsed ? (
            <div>
              <button
                type="button"
                onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-[#f7f7f7] shadow-sm text-xs font-medium transition-all border border-[#f0f0f0]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {activeRepo ? (
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: activeRepo.colorTag }}
                    />
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-[#7f1e23] flex-shrink-0" />
                  )}
                  <span className={`truncate font-semibold ${activeRepo ? "text-black" : "text-[#737373]"}`}>
                    {activeRepo ? activeRepo.name : "Select Repository"}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#737373] transition-transform ${
                    isRepoDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu when Expanded */}
              {isRepoDropdownOpen && (
                <div className="absolute left-3 right-3 top-12 mt-1 bg-white rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-1 max-h-64 overflow-y-auto border border-[#eeeeee]">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-[#737373] uppercase tracking-wider flex items-center justify-between">
                    <span>Your Repositories</span>
                    <span className="text-[10px] font-medium text-[#737373]/70">{repositories.length}</span>
                  </div>
                  {repositories.map((repo) => (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => {
                        dispatch(setActiveRepositoryId(repo.id));
                        dispatch(setActiveWorkspaceView("workspace"));
                        setIsRepoDropdownOpen(false);
                        dispatch(closeMobileSidebar());
                        router.push(`/${getRepoSlug(repo)}`);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                        repo.id === activeRepositoryId
                          ? "bg-[#ffd4a5]/40 text-[#7f1e23] font-semibold"
                          : "hover:bg-[#f5f5f5] text-black"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: repo.colorTag }}
                        />
                        <span className="truncate">{repo.name}</span>
                      </div>
                      {repo.id === activeRepositoryId && (
                        <Check className="w-3.5 h-3.5 text-[#7f1e23] flex-shrink-0" />
                      )}
                    </button>
                  ))}

                  <div className="my-1 border-t border-[#f0f0f0]" />

                  {/* All Repositories link */}
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(setActiveRepositoryId(null));
                      dispatch(setActiveWorkspaceView("repositories"));
                      setIsRepoDropdownOpen(false);
                      dispatch(closeMobileSidebar());
                      router.push("/repositories");
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                      !activeRepositoryId
                        ? "bg-[#ffd4a5]/40 text-[#7f1e23] font-semibold"
                        : "text-[#737373] hover:text-black hover:bg-[#f5f5f5]"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Repositories Overview</span>
                  </button>

                  {/* Create New Repo link */}
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(openCreateRepoModal());
                      setIsRepoDropdownOpen(false);
                      dispatch(closeMobileSidebar());
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-[#7f1e23] font-semibold hover:bg-[#ffd4a5]/20 transition-colors"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-[#7f1e23]" />
                    <span>Create New Repository</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
                title={activeRepo ? `Repository: ${activeRepo.name} (Click to switch)` : "Select Repository"}
                className={`w-full flex items-center justify-center p-2 rounded-xl shadow-sm transition-all border ${
                  isRepoDropdownOpen
                    ? "bg-[#ffd4a5] text-[#7f1e23] border-[#ffd4a5]"
                    : "bg-white hover:bg-[#f5f5f5] text-black border-[#f0f0f0]"
                }`}
              >
                {activeRepo ? (
                  <span
                    className="w-3 h-3 rounded-full shadow-xs"
                    style={{ backgroundColor: activeRepo.colorTag }}
                  />
                ) : (
                  <Layers className="w-4 h-4 text-[#7f1e23]" />
                )}
              </button>

              {/* Pop-up Box to the right when Sidebar is Collapsed */}
              {isRepoDropdownOpen && (
                <div className="absolute left-full top-0 ml-3 w-64 bg-white rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.14)] z-50 p-2 flex flex-col gap-1 max-h-80 overflow-y-auto border border-black/10">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-[#737373] uppercase tracking-wider flex items-center justify-between">
                    <span>Your Repositories</span>
                    <span className="text-[10px] font-medium text-[#737373]/70">{repositories.length}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-y-auto pr-0.5 max-h-48">
                    {repositories.map((repo) => (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => {
                          dispatch(setActiveRepositoryId(repo.id));
                          dispatch(setActiveWorkspaceView("workspace"));
                          setIsRepoDropdownOpen(false);
                          router.push(`/${getRepoSlug(repo)}`);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                          repo.id === activeRepositoryId
                            ? "bg-[#ffd4a5]/40 text-[#7f1e23] font-semibold"
                            : "hover:bg-[#f5f5f5] text-black"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-xs"
                            style={{ backgroundColor: repo.colorTag }}
                          />
                          <span className="truncate">{repo.name}</span>
                        </div>
                        {repo.id === activeRepositoryId && (
                          <Check className="w-3.5 h-3.5 text-[#7f1e23] flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="my-1 border-t border-[#f0f0f0]" />

                  {/* All Repositories link */}
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(setActiveRepositoryId(null));
                      dispatch(setActiveWorkspaceView("repositories"));
                      setIsRepoDropdownOpen(false);
                      router.push("/repositories");
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors ${
                      !activeRepositoryId
                        ? "bg-[#ffd4a5]/40 text-[#7f1e23] font-semibold"
                        : "text-[#737373] hover:text-black hover:bg-[#f5f5f5]"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Repositories Overview</span>
                  </button>

                  {/* Create New Repo link */}
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(openCreateRepoModal());
                      setIsRepoDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-[#7f1e23] font-semibold hover:bg-[#ffd4a5]/20 transition-colors"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-[#7f1e23]" />
                    <span>Create New Repository</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section Divider */}
        <div className="px-4 pb-2">
          {!isCollapsed ? (
            <div className="flex items-center justify-between text-[11px] font-bold text-[#737373] uppercase tracking-wider">
              <span>Discussions</span>
              <span className="text-[10px] font-medium text-[#737373]/80">
                {conversations.length}
              </span>
            </div>
          ) : (
            <div className="w-full border-t border-[#ebebeb]" />
          )}
        </div>

        {/* Chat Threads List (Chronological like Gemini/ChatGPT) */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4">
          {!activeRepositoryId ? (
            !isCollapsed && (
              <div className="px-3 py-6 text-center text-xs text-[#737373]">
                <MessageSquare className="w-5 h-5 mx-auto mb-2 text-[#737373]/50" />
                <p>No repository selected.</p>
                <p className="text-[10px] mt-1 text-[#737373]/70">
                  Select a repository to view discussions.
                </p>
              </div>
            )
          ) : conversations.length === 0 ? (
            !isCollapsed && (
              <div className="px-3 py-6 text-center text-xs text-[#737373]">
                <MessageSquare className="w-5 h-5 mx-auto mb-2 text-[#737373]/50" />
                <p>No chat threads yet.</p>
                <p className="text-[10px] mt-1 text-[#737373]/70">
                  Click &ldquo;New Thread&rdquo; to start.
                </p>
              </div>
            )
          ) : (
            <>
              {/* Group: Today */}
              {today.length > 0 && (
                <div>
                  {!isCollapsed && (
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-[#737373] uppercase tracking-wider">
                      Today
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {today.map((convo) => renderThreadItem(convo))}
                  </div>
                </div>
              )}

              {/* Group: Previous 7 Days */}
              {pastWeek.length > 0 && (
                <div>
                  {!isCollapsed && (
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-[#737373] uppercase tracking-wider">
                      Previous 7 Days
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {pastWeek.map((convo) => renderThreadItem(convo))}
                  </div>
                </div>
              )}

              {/* Group: Older */}
              {older.length > 0 && (
                <div>
                  {!isCollapsed && (
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-[#737373] uppercase tracking-wider">
                      Older
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {older.map((convo) => renderThreadItem(convo))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom User Profile & Separate Logout */}
      <div className="p-3 bg-transparent border-none flex flex-col gap-2.5">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#ffd4a5] text-[#7f1e23] font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                {user?.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-black truncate">
                  {user?.name || "Researcher"}
                </span>
                <span className="text-[10px] text-[#737373] truncate">
                  {user?.email || "researcher@workspace"}
                </span>
              </div>
            </div>

            {/* Dedicated Logout Button below profile details */}
            <button
              type="button"
              onClick={() => {
                dispatch(closeMobileSidebar());
                setIsLogoutModalOpen(true);
              }}
              title="Log Out"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[#7f1e23] hover:bg-[#7f1e23]/10 border border-[#f0f0f0] hover:border-[#7f1e23]/20 transition-all active:scale-[0.98]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </>
        ) : (
          <>
            <div
              className="w-8 h-8 rounded-full bg-[#ffd4a5] text-[#7f1e23] font-bold text-xs flex items-center justify-center shadow-sm"
              title={`${user?.name || "Researcher"} (${user?.email || "researcher@workspace"})`}
            >
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <button
              type="button"
              onClick={() => {
                dispatch(closeMobileSidebar());
                setIsLogoutModalOpen(true);
              }}
              title="Log Out"
              className="p-2 rounded-xl text-[#737373] hover:text-[#7f1e23] hover:bg-[#7f1e23]/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </aside>

    {/* Confirm Delete Discussion Thread Modal */}
    <ConfirmDeleteModal
      isOpen={!!threadToDelete}
      onClose={() => setThreadToDelete(null)}
      onConfirm={handleConfirmDeleteThread}
      title="Delete Discussion Thread"
      itemType="thread"
      itemName={threadToDelete?.title}
      description="This action cannot be undone. All messages and citations in this thread will be permanently deleted."
      isLoading={isDeletingThread}
      confirmLabel="Delete Thread"
    />

    {/* Confirm Logout Modal */}
    <ConfirmLogoutModal
      isOpen={isLogoutModalOpen}
      onClose={() => setIsLogoutModalOpen(false)}
      onConfirm={handleConfirmLogout}
      isLoading={isLoggingOut}
    />
  </>
  );

  function renderThreadItem(convo: Conversation) {
    const isActive = convo.id === activeConversationId;
    const isEditing = editingChatId === convo.id;

    if (isCollapsed) {
      return (
        <button
          key={convo.id}
          type="button"
          onClick={() => {
            dispatch(setActiveConversationId(convo.id));
            dispatch(setActiveWorkspaceView("workspace"));
            dispatch(closeMobileSidebar());
            if (activeRepo) {
              router.push(`/${getRepoSlug(activeRepo)}`);
            }
          }}
          title={convo.title}
          className={`w-full py-2 flex items-center justify-center rounded-xl transition-all ${
            isActive
              ? "bg-[#ffd4a5] text-[#7f1e23]"
              : "text-[#737373] hover:text-black hover:bg-[#f5f5f5]"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      );
    }

    if (isEditing) {
      return (
        <div
          key={convo.id}
          className="flex items-center gap-1 px-2 py-1 bg-white rounded-xl shadow-sm"
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRename(convo.id);
              if (e.key === "Escape") setEditingChatId(null);
            }}
            autoFocus
            className="flex-1 text-xs bg-transparent text-black outline-none py-1 px-1"
          />
          <button
            type="button"
            onClick={() => handleSaveRename(convo.id)}
            className="p-1 text-green-700 hover:bg-green-50 rounded"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditingChatId(null)}
            className="p-1 text-[#737373] hover:bg-gray-100 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <div
        key={convo.id}
        onClick={() => {
          dispatch(setActiveConversationId(convo.id));
          dispatch(setActiveWorkspaceView("workspace"));
          dispatch(closeMobileSidebar());
          if (activeRepo) {
            router.push(`/${getRepoSlug(activeRepo)}`);
          }
        }}
        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
          isActive
            ? "bg-[#ffd4a5]/40 text-[#7f1e23] font-semibold"
            : "text-[#737373] hover:bg-[#f5f5f5] hover:text-black"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              isActive ? "text-[#7f1e23]" : "text-[#737373]"
            }`}
          />
          <span className="truncate">{convo.title}</span>
        </div>

        {/* Hover Action Controls: Rename & Delete */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingChatId(convo.id);
              setEditTitle(convo.title);
            }}
            title="Rename discussion"
            className="p-1 text-[#737373] hover:text-black hover:bg-white rounded transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setThreadToDelete(convo);
            }}
            title="Delete discussion"
            className="p-1 text-[#737373] hover:text-[#7f1e23] hover:bg-white rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }
};
