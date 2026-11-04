import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { store } from "@/store";
import { setAccessToken, logout } from "@/store/slices/authSlice";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach in-memory Access Token from Redux
api.interceptors.request.use(
  (reqConfig: InternalAxiosRequestConfig) => {
    const state = store.getState();
    const token = state.auth.accessToken;

    if (token && reqConfig.headers) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    return reqConfig;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 & Silently Rotate Refresh Token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Avoid infinite loop on auth endpoints
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              resolve(api(originalRequest));
            },
            reject: (err) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Post to refresh endpoint with HTTP-only cookie automatically attached
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;

        if (newAccessToken) {
          store.dispatch(setAccessToken(newAccessToken));
          processQueue(null, newAccessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return api(originalRequest);
        } else {
          throw new Error("No access token returned from refresh.");
        }
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        // Only log out if server explicitly rejected auth credentials (401 / 403)
        if (
          refreshError?.response?.status === 401 ||
          refreshError?.response?.status === 403
        ) {
          store.dispatch(logout());
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Ensures an active, unexpired access token is available.
 * If token is expired or missing, attempts silent refresh.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const state = store.getState();
  let token = state.auth.accessToken;

  if (token) {
    try {
      const base64Url = token.split(".")[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const { exp } = JSON.parse(jsonPayload);
        // If expired or expiring within 30 seconds, refresh
        if (exp && exp * 1000 - Date.now() < 30000) {
          token = null;
        }
      }
    } catch {
      // Proceed with current token
    }
  }

  if (!token) {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      token = res.data?.data?.accessToken || null;
      if (token) {
        store.dispatch(setAccessToken(token));
      }
    } catch {
      return null;
    }
  }

  return token;
}

export default api;
