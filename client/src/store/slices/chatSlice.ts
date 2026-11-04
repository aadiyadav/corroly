import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Citation {
  citationId: string;
  docId: string;
  docTitle: string;
  pageNumber: number;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  citations?: Citation[] | null;
  tokenCount?: number | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  selectedDocIdsByThread: Record<string, string[]>;
  isStreaming: boolean;
  streamingContent: string;
  streamingCitations: Citation[];
  isLoading: boolean;
}

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: [],
  selectedDocIdsByThread: {},
  isStreaming: false,
  streamingContent: "",
  streamingCitations: [],
  isLoading: false,
};

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
      state.isLoading = false;
      if (!state.activeConversationId && action.payload.length > 0) {
        state.activeConversationId = action.payload[0].id;
      }
    },
    setActiveConversationId: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      state.conversations.unshift(action.payload);
      state.activeConversationId = action.payload.id;
      state.messages = [];
    },
    setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.messages = action.payload;
      state.isLoading = false;
    },
    appendMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    startStreaming: (state) => {
      state.isStreaming = true;
      state.streamingContent = "";
      state.streamingCitations = [];
    },
    appendStreamToken: (state, action: PayloadAction<string>) => {
      state.streamingContent += action.payload;
    },
    setStreamCitations: (state, action: PayloadAction<Citation[]>) => {
      state.streamingCitations = action.payload;
    },
    finishStreaming: (state, action: PayloadAction<{ messageId: string }>) => {
      if (state.activeConversationId && state.streamingContent) {
        state.messages.push({
          id: action.payload.messageId,
          conversationId: state.activeConversationId,
          role: "ASSISTANT",
          content: state.streamingContent,
          citations: state.streamingCitations.length > 0 ? state.streamingCitations : null,
          createdAt: new Date().toISOString(),
        });
      }
      state.isStreaming = false;
      state.streamingContent = "";
      state.streamingCitations = [];
    },
    setChatLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateConversationInState: (
      state,
      action: PayloadAction<{ id: string; title: string }>
    ) => {
      const c = state.conversations.find((item) => item.id === action.payload.id);
      if (c) {
        c.title = action.payload.title;
      }
    },
    removeConversationFromState: (state, action: PayloadAction<string>) => {
      state.conversations = state.conversations.filter((c) => c.id !== action.payload);
      if (state.activeConversationId === action.payload) {
        state.activeConversationId = state.conversations.length > 0 ? state.conversations[0].id : null;
        state.messages = [];
      }
    },
    setThreadSelectedDocs: (
      state,
      action: PayloadAction<{ threadId: string; docIds: string[] }>
    ) => {
      state.selectedDocIdsByThread[action.payload.threadId] = action.payload.docIds;
    },
    toggleThreadDoc: (
      state,
      action: PayloadAction<{ threadId: string; docId: string; allDocIds: string[] }>
    ) => {
      const { threadId, docId, allDocIds } = action.payload;
      const current = state.selectedDocIdsByThread[threadId] ?? allDocIds;
      if (current.includes(docId)) {
        state.selectedDocIdsByThread[threadId] = current.filter((id) => id !== docId);
      } else {
        state.selectedDocIdsByThread[threadId] = [...current, docId];
      }
    },
    selectAllThreadDocs: (
      state,
      action: PayloadAction<{ threadId: string; allDocIds: string[] }>
    ) => {
      state.selectedDocIdsByThread[action.payload.threadId] = [...action.payload.allDocIds];
    },
    clearThreadDocs: (state, action: PayloadAction<{ threadId: string }>) => {
      state.selectedDocIdsByThread[action.payload.threadId] = [];
    },
  },
});

export const {
  setConversations,
  setActiveConversationId,
  addConversation,
  setMessages,
  appendMessage,
  startStreaming,
  appendStreamToken,
  setStreamCitations,
  finishStreaming,
  setChatLoading,
  updateConversationInState,
  removeConversationFromState,
  setThreadSelectedDocs,
  toggleThreadDoc,
  selectAllThreadDocs,
  clearThreadDocs,
} = chatSlice.actions;

export default chatSlice.reducer;
