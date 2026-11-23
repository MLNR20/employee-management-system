import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeeNotifications } from "../container";

const KEY = ["employee-portal", "notifications"];
const COUNT_KEY = [...KEY, "unread-count"];
const LIST_KEY = [...KEY, "list"];
const PAGE_SIZE = 20;

/**
 * The employee portal's bell: the same shape as useNotifications, but for the signed-in employee's own
 * notifications (for a manager, their reports' leave requests). A socket carrying the employee token keeps
 * it live. Mount it once, in the portal's top bar.
 */
export function usePortalNotifications({ open }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
    return employeeNotifications.subscribe({ onNew: refresh, onConnect: refresh });
  }, [queryClient]);

  const unread = useQuery({ queryKey: COUNT_KEY, queryFn: employeeNotifications.unreadCount });

  const list = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => employeeNotifications.list({ page: 1, pageSize: PAGE_SIZE }),
    enabled: open,
  });

  const onSettled = () => queryClient.invalidateQueries({ queryKey: KEY });
  const markAsRead = useMutation({ mutationFn: employeeNotifications.markAsRead, onSettled });
  const markAllAsRead = useMutation({ mutationFn: employeeNotifications.markAllAsRead, onSettled });

  return {
    unreadCount: unread.data ?? 0,
    notifications: list.data?.items ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
}
