import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Document {
  id: string;
  repositoryId: string;
  title: string;
  authors: string[];
  abstract: string | null;
  source: "ARXIV" | "SEMANTIC_SCHOLAR" | "PUBMED" | "WIKIPEDIA" | "MANUAL_UPLOAD";
  externalId: string | null;
  cloudinaryUrl: string | null;
  cloudinaryPublicId: string | null;
  fileSizeBytesRaw: number | null;
  fileSizeBytesComp: number | null;
  pageCount: number | null;
  status: "PENDING" | "PROCESSING" | "INDEXED" | "FAILED";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionJobStatus {
  jobId: string;
  docId: string;
  percent: number;
  stage: string;
  message?: string;
  isCompleted: boolean;
  isError: boolean;
  error?: string;
}

interface DocumentState {
  documents: Document[];
  activeDocumentId: string | null;
  ingestionJobs: Record<string, IngestionJobStatus>;
  isLoading: boolean;
}

const initialState: DocumentState = {
  documents: [],
  activeDocumentId: null,
  ingestionJobs: {},
  isLoading: false,
};

export const documentSlice = createSlice({
  name: "document",
  initialState,
  reducers: {
    setDocuments: (state, action: PayloadAction<Document[]>) => {
      state.documents = action.payload;
      state.isLoading = false;
    },
    setActiveDocumentId: (state, action: PayloadAction<string | null>) => {
      state.activeDocumentId = action.payload;
    },
    addDocument: (state, action: PayloadAction<Document>) => {
      state.documents.unshift(action.payload);
      state.activeDocumentId = action.payload.id;
    },
    updateDocumentInState: (state, action: PayloadAction<Partial<Document> & { id: string }>) => {
      const idx = state.documents.findIndex((d) => d.id === action.payload.id);
      if (idx !== -1) {
        state.documents[idx] = { ...state.documents[idx], ...action.payload };
      }
    },
    removeDocumentFromState: (state, action: PayloadAction<string>) => {
      state.documents = state.documents.filter((d) => d.id !== action.payload);
      if (state.activeDocumentId === action.payload) {
        state.activeDocumentId = null;
      }
    },
    updateJobProgress: (state, action: PayloadAction<IngestionJobStatus>) => {
      state.ingestionJobs[action.payload.jobId] = action.payload;
      // Update corresponding document status if matched
      const doc = state.documents.find((d) => d.id === action.payload.docId);
      if (doc) {
        if (
          action.payload.isCompleted ||
          action.payload.stage?.toUpperCase() === "COMPLETED" ||
          action.payload.stage?.toUpperCase() === "INDEXED" ||
          action.payload.percent === 100
        ) {
          doc.status = "INDEXED";
        } else if (action.payload.isError || action.payload.stage?.toUpperCase() === "FAILED") {
          doc.status = "FAILED";
          doc.errorMessage = action.payload.error || "Ingestion error";
        } else {
          doc.status = "PROCESSING";
        }
      }
    },
    setDocLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setDocuments,
  setActiveDocumentId,
  addDocument,
  updateDocumentInState,
  removeDocumentFromState,
  updateJobProgress,
  setDocLoading,
} = documentSlice.actions;

export default documentSlice.reducer;
