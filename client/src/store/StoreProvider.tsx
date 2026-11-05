"use client";

import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store, useAppDispatch } from "./index";
import { setCredentials, setInitialized } from "./slices/authSlice";
import { api } from "@/lib/api";

let inflightRestore: Promise<{ user: any; accessToken: string } | null> | null = null;

async function doRestoreSession() {
  if (!inflightRestore) {
    const storedToken =
      typeof window !== "undefined"
        ? localStorage.getItem("corroly_refresh_token")
        : null;

    inflightRestore = api
      .post("/auth/refresh", { refreshToken: storedToken || undefined })
      .then((res) => {
        if (res.data?.data) {
          const { user, accessToken, refreshToken } = res.data.data;
          if (refreshToken && typeof window !== "undefined") {
            try {
              localStorage.setItem("corroly_refresh_token", refreshToken);
            } catch {}
          }
          return {
            user,
            accessToken,
            refreshToken,
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
