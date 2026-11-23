import { useEffect, useRef, useState } from "react";
import SidebarIcon from "./SidebarIcon";
import { useNotifications } from "../hooks/useNotifications";

/** "just now", "5 min ago", "3 h ago", "2 d ago"; older than a week shows the date. */
function timeAgo(date) {
  if (!date) return "";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return date.toLocaleDateString();
}

/**
 * The bell: an unread badge, and a dropdown of the latest notifications that updates live. By default it is the
 * administrators' navbar bell; the employee portal passes `useData={usePortalNotifications}` for its own.
 * `useData` is a hook, so a given bell must always be given the same one.
 */
export default function NotificationBell({ useData = useNotifications }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);
  const { unreadCount, notifications, isLoading, isError, markAsRead, markAllAsRead } = useData({ open });

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapper.current && !wrapper.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div className="relative" ref={wrapper}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
      >
        <SidebarIcon name="bell" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[0.65rem] font-semibold leading-none">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && <p className="px-4 py-6 text-sm text-center text-gray-500">Loading…</p>}
            {isError && <p className="px-4 py-6 text-sm text-center text-red-600">Could not load notifications.</p>}
            {!isLoading && !isError && notifications.length === 0 && (
              <p className="px-4 py-6 text-sm text-center text-gray-500">You're all caught up.</p>
            )}

            <ul className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 ${
                      notification.isRead ? "" : "bg-blue-50/50"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 w-2 h-2 shrink-0 rounded-full ${notification.isRead ? "bg-transparent" : "bg-blue-600"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`text-sm truncate ${notification.isRead ? "text-gray-700" : "font-semibold text-gray-900"}`}>
                          {notification.title}
                        </span>
                        <span className="shrink-0 text-xs text-gray-400">{timeAgo(notification.dateCreated)}</span>
                      </span>
                      {notification.subtitle && (
                        <span className="block text-xs text-gray-500 truncate">{notification.subtitle}</span>
                      )}
                      {notification.body && (
                        <span className="block mt-1 text-sm text-gray-600 break-words">{notification.body}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
