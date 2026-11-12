import { useState } from "react";
import SidebarIcon from "./SidebarIcon";

/** Password field with an eye button on its right edge that shows or hides the text. */
export default function PasswordInput({ className = "", ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-900"
      >
        <SidebarIcon name={visible ? "eyeSlash" : "eye"} />
      </button>
    </div>
  );
}
