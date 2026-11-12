import { QueryClient } from "@tanstack/react-query";
import { SessionExpiredError } from "./domain/errors";

// Retrying cannot fix an expired session or a 4xx; only transient failures get another try.
const shouldRetry = (failureCount, error) => {
  if (error instanceof SessionExpiredError) return false;
  const status = error?.response?.status;
  if (status >= 400 && status < 500) return false;
  return failureCount < 2;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
  },
});
