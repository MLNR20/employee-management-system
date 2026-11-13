import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sidebarCollapsed";

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch (error) {
    return false; // storage can be blocked; the sidebar just starts expanded
  }
};

/**
 * Whether the sidebar is collapsed to icons, remembered between visits. The state lives on
 * <body> as the "sidebar-collapsed" class: index.css resizes the sidebar and the page content
 * from it, so no page needs to know about it.
 */
export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(readStored);

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch (error) {
      // not remembered; nothing else to do
    }
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((value) => !value), []);
  return { collapsed, toggle };
}
