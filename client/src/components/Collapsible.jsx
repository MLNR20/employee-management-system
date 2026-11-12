import { useState } from "react";
import SidebarIcon from "./SidebarIcon";

/** A titled section whose content can be hidden with the header button. Open by default. */
export default function Collapsible({ title, defaultOpen = true, className = "", children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={className}>
      <button
        type="button"
        className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-600 hover:text-gray-900"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {title}
        <span className={`transition-transform ${open ? "" : "-rotate-90"}`}>
          <SidebarIcon name="chevronDown" />
        </span>
      </button>
      {open && children}
    </section>
  );
}
