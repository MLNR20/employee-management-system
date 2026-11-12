// Single place that knows where session tokens live.
const ACCESS_KEY = "token";
const REFRESH_KEY = "refreshToken";

export const tokenStorage = {
  getAccessToken: () => sessionStorage.getItem(ACCESS_KEY),
  getRefreshToken: () => sessionStorage.getItem(REFRESH_KEY),

  setTokens({ accessToken, refreshToken }) {
    if (accessToken) sessionStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
  },

  clear() {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },

  hasSession: () =>
    Boolean(sessionStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(REFRESH_KEY)),
};
