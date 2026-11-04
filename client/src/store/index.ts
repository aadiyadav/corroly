import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import authReducer from "./slices/authSlice";
import repositoryReducer from "./slices/repositorySlice";
import documentReducer from "./slices/documentSlice";
import chatReducer from "./slices/chatSlice";
import uiReducer from "./slices/uiSlice";


export const store = configureStore({
  reducer: {
    auth: authReducer,
    repository: repositoryReducer,
    document: documentReducer,
    chat: chatReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
