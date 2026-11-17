import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { employeePortal, setEmployeeSessionExpiredHandler } from "../container";

const EmployeeAuthContext = createContext(null);

// Every query the portal makes lives under this key, so a sign-out can drop all of it at once
// without touching the administrator's cache.
const PORTAL_KEY = ["employee-portal"];

/**
 * Single source of truth for the signed-in employee, kept apart from the administrator session
 * (AuthContext) because the two use different tokens. Owns login, logout and session expiry.
 * Must render inside the QueryClientProvider.
 */
export function EmployeeAuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(() => employeePortal.isSignedIn());

  const {
    data: employee = null,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [...PORTAL_KEY, "me"],
    queryFn: employeePortal.getMe,
    enabled: isAuthenticated,
    staleTime: Infinity,
    retry: false,
  });

  const endSession = useCallback(() => {
    queryClient.removeQueries({ queryKey: PORTAL_KEY }); // never show this employee's data to the next
    setIsAuthenticated(false);
  }, [queryClient]);

  // The portal client calls this when the server rejects the employee's token.
  useEffect(() => {
    setEmployeeSessionExpiredHandler(endSession);
  }, [endSession]);

  // If the token is accepted but the employee cannot be loaded, the session is unusable: end it
  // rather than leave a signed-in shell with no one in it.
  useEffect(() => {
    if (isError) {
      employeePortal.logout();
      endSession();
    }
  }, [isError, endSession]);

  const login = useCallback(
    async (credentials) => {
      await employeePortal.login(credentials);
      queryClient.removeQueries({ queryKey: PORTAL_KEY });
      setIsAuthenticated(true);
    },
    [queryClient]
  );

  const logout = useCallback(() => {
    employeePortal.logout();
    endSession();
  }, [endSession]);

  const value = useMemo(
    () => ({ employee, isAuthenticated, isLoading, login, logout }),
    [employee, isAuthenticated, isLoading, login, logout]
  );

  return <EmployeeAuthContext.Provider value={value}>{children}</EmployeeAuthContext.Provider>;
}

export function useEmployeeAuth() {
  const context = useContext(EmployeeAuthContext);
  if (!context) throw new Error("useEmployeeAuth must be used inside <EmployeeAuthProvider>");
  return context;
}
