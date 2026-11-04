"use client";

import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store, useAppDispatch } from "./index";
import { setCredentials, setInitialized } from "./slices/authSlice";
import { api } from "@/lib/api";

let inflightRestore: Promise<{ user: any; accessToken: string } | null> | null = null;

async function doRestoreSession() {
  if (!inflightRestore) {
    inflightRestore = api
      .post("/auth/refresh")
      .then((res) => {
        if (res.data?.data) {
          return {
            user: res.data.data.user,
            accessToken: res.data.data.accessToken,
          };
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        setTimeout(() => {
          inflightRestore = null;
        }, 1000);
      });
  }
  return inflightRestore;
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      const result = await doRestoreSession();
      if (!isMounted) return;

      if (result) {
        dispatch(setCredentials(result));
      } else {
        dispatch(setInitialized(true));
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  return <>{children}</>;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  );
}
