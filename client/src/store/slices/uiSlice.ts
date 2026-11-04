import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Document } from "./documentSlice";


interface UiState {
  isAuthModalOpen: boolean;
  isDiscoveryModalOpen: boolean;
  isCreateRepoModalOpen: boolean;
  isReaderOpen: boolean;
  readerDoc: Document | null;
  readerPage: number;
  activeCitationId: string | null;
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  activeWorkspaceView: "workspace" | "repositories";
}

const initialState: UiState = {
  isAuthModalOpen: false,
  isDiscoveryModalOpen: false,
  isCreateRepoModalOpen: false,
  isReaderOpen: false,
  readerDoc: null,
  readerPage: 1,
  activeCitationId: null,
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  activeWorkspaceView: "repositories",
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openAuthModal: (state) => {
      state.isAuthModalOpen = true;
    },
    closeAuthModal: (state) => {
      state.isAuthModalOpen = false;
    },
    openDiscoveryModal: (state) => {
      state.isDiscoveryModalOpen = true;
    },
    closeDiscoveryModal: (state) => {
      state.isDiscoveryModalOpen = false;
    },
    openCreateRepoModal: (state) => {
      state.isCreateRepoModalOpen = true;
    },
    closeCreateRepoModal: (state) => {
      state.isCreateRepoModalOpen = false;
    },
    openReader: (state, action: PayloadAction<{ doc: Document; page?: number }>) => {
      state.isReaderOpen = true;
      state.readerDoc = action.payload.doc;
      state.readerPage = action.payload.page || 1;
    },
    closeReader: (state) => {
      state.isReaderOpen = false;
      state.readerDoc = null;
      state.activeCitationId = null;
    },
    setReaderPage: (state, action: PayloadAction<number>) => {
      state.readerPage = action.payload;
    },
    jumpToCitation: (
      state,
      action: PayloadAction<{ doc: Document; page: number; citationId: string }>
    ) => {
      state.isReaderOpen = true;
      state.readerDoc = action.payload.doc;
      state.readerPage = action.payload.page;
      state.activeCitationId = action.payload.citationId;
    },
    clearActiveCitation: (state) => {
      state.activeCitationId = null;
    },
    toggleSidebar: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    openMobileSidebar: (state) => {
      state.isMobileSidebarOpen = true;
    },
    closeMobileSidebar: (state) => {
      state.isMobileSidebarOpen = false;
    },
    toggleMobileSidebar: (state) => {
      state.isMobileSidebarOpen = !state.isMobileSidebarOpen;
    },
    setActiveWorkspaceView: (state, action: PayloadAction<"workspace" | "repositories">) => {
      state.activeWorkspaceView = action.payload;
    },
  },
});

export const {
  openAuthModal,
  closeAuthModal,
  openDiscoveryModal,
  closeDiscoveryModal,
  openCreateRepoModal,
  closeCreateRepoModal,
  openReader,
  closeReader,
  setReaderPage,
  jumpToCitation,
  clearActiveCitation,
  toggleSidebar,
  setSidebarCollapsed,
  openMobileSidebar,
  closeMobileSidebar,
  toggleMobileSidebar,
  setActiveWorkspaceView,
} = uiSlice.actions;

export default uiSlice.reducer;
