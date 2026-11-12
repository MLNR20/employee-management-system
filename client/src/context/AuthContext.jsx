import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authUseCases, setSessionExpiredHandler } from "../container";

const AuthContext = createContext(null);

/**
 * Single source of truth for who is signed in. Holds whether a session exists,
 * loads the current administrator, and owns login, logout and session expiry,
 * so components never touch tokens or the cache to sign in or out.
 * Must render inside the Router and the QueryClientProvider.
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(() => authUseCases.isAuthenticated());

  const { data: administrator = null, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: authUseCases.getCurrentAdministrator,
    enabled: isAuthenticated,
    staleTime: Infinity,
  });

  // The API client calls this when the refresh token can no longer renew the session.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear();
      setIsAuthenticated(false);
      navigate("/login", { replace: true });
    });
  }, [navigate, queryClient]);

  const login = useCallback(
    async (credentials) => {
      await authUseCases.login(credentials);
      queryClient.clear(); // never show the previous user's cached data
      setIsAuthenticated(true);
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    try {
      await authUseCases.logout();
    } finally {
      queryClient.clear();
      setIsAuthenticated(false);
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ administrator, isAuthenticated, isLoading, login, logout }),
    [administrator, isAuthenticated, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
