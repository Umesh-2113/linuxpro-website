"use client";

import { useCallback, useEffect, useState } from "react";
import { getStoredTheme, toggleTheme, type Theme } from "@/lib/theme";

type Props = {
  className?: string;
  showLabel?: boolean;
};

export function ThemeToggle({ className = "", showLabel = false }: Props) {
  const [theme, setTheme] = useState<Theme>("dark");

  const sync = useCallback(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("theme-updated", sync);
    return () => window.removeEventListener("theme-updated", sync);
  }, [sync]);

  const handleToggle = () => {
    setTheme(toggleTheme());
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle${className ? ` ${className}` : ""}`}
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className="theme-toggle__icon" aria-hidden>
        {isDark ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </span>
      {showLabel && <span className="theme-toggle__label">{isDark ? "Light" : "Dark"}</span>}
    </button>
  );
}
