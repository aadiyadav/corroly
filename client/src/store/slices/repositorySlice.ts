import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Repository {
  id: string;
  name: string;
  description: string | null;
  colorTag: string;
  documentCount: number;
  conversationCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RepositoryState {
  repositories: Repository[];
  activeRepositoryId: string | null;
  isLoading: boolean;
}

const initialState: RepositoryState = {
  repositories: [],
  activeRepositoryId: null,
  isLoading: false,
};

export const repositorySlice = createSlice({
  name: "repository",
  initialState,
  reducers: {
    setRepositories: (state, action: PayloadAction<Repository[]>) => {
      state.repositories = action.payload;
      state.isLoading = false;
    },
    setActiveRepositoryId: (state, action: PayloadAction<string | null>) => {
      state.activeRepositoryId = action.payload;
    },
    addRepository: (state, action: PayloadAction<Repository>) => {
      state.repositories.unshift(action.payload);
      state.activeRepositoryId = action.payload.id;
    },
    updateRepositoryInState: (state, action: PayloadAction<Partial<Repository> & { id: string }>) => {
      const idx = state.repositories.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) {
        state.repositories[idx] = { ...state.repositories[idx], ...action.payload };
      }
    },
    removeRepositoryFromState: (state, action: PayloadAction<string>) => {
      state.repositories = state.repositories.filter((r) => r.id !== action.payload);
      if (state.activeRepositoryId === action.payload) {
        state.activeRepositoryId = state.repositories.length > 0 ? state.repositories[0].id : null;
      }
    },
    setRepoLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setRepositories,
  setActiveRepositoryId,
  addRepository,
  updateRepositoryInState,
  removeRepositoryFromState,
  setRepoLoading,
} = repositorySlice.actions;

export default repositorySlice.reducer;
