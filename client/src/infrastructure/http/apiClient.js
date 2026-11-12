import axios from "axios";
import { API_BASE_URL } from "../config/env";
import { tokenStorage } from "../storage/tokenStorage";
import { SessionExpiredError } from "../../domain/errors";

// Authenticated client: attaches the access token and transparently renews it.
export const apiClient = axios.create({ baseURL: API_BASE_URL });

// Unauthenticated client for login/register/refresh. No interceptors, so a
// failing refresh can never trigger another refresh.
export const publicClient = axios.create({ baseURL: API_BASE_URL });

let onSessionExpired = () => {};

/** Lets the app decide what happens when the refresh token is no longer usable. */
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// Concurrent 401s share one refresh call. Refresh tokens rotate, so a second
// parallel refresh with the old token would be rejected as a replay.
let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    const refreshToken = tokenStorage.getRefreshToken();

    refreshPromise = publicClient
      .post("/admin/refresh", { refreshToken })
      .then(({ data }) => {
        tokenStorage.setTokens({
          accessToken: data.token,
          refreshToken: data.refreshToken,
        });
        return data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || !original || original._retried) {
      return Promise.reject(error);
    }

    if (!tokenStorage.getRefreshToken()) {
      tokenStorage.clear();
      onSessionExpired();
      return Promise.reject(new SessionExpiredError());
    }

    original._retried = true;

    try {
      const token = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${token}`;
      return apiClient(original);
    } catch (refreshError) {
      tokenStorage.clear();
      onSessionExpired();
      return Promise.reject(new SessionExpiredError());
    }
  }
);
