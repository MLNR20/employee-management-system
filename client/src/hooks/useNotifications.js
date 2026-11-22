import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationUseCases } from "../container";

const KEY = ["notifications"];
const COUNT_KEY = [...KEY, "unread-count"];
const LIST_KEY = [...KEY, "list"];
const PAGE_SIZE = 20;

/**
 * The bell's data: the unread count, the latest notifications (loaded only while `open`), and the actions that
 * mark them read. A socket keeps it live: each pushed notification refreshes both. Mount it once, inside the
 * navbar, so there is a single connection for the signed-in administrator.
 */
export function useNotifications({ open }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
    return notificationUseCases.subscribe({ onNew: refresh, onConnect: refresh });
  }, [queryClient]);

  const unread = useQuery({ queryKey: COUNT_KEY, queryFn: notificationUseCases.unreadCount });

  const list = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => notificationUseCases.listPage({ page: 1, pageSize: PAGE_SIZE }),
    enabled: open,
  });

  const onSettled = () => queryClient.invalidateQueries({ queryKey: KEY });
  const markAsRead = useMutation({ mutationFn: notificationUseCases.markAsRead, onSettled });
  const markAllAsRead = useMutation({ mutationFn: notificationUseCases.markAllAsRead, onSettled });

  return {
    unreadCount: unread.data ?? 0,
    notifications: list.data?.items ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
}
