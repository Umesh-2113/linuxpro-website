"use client";

import Link from "next/link";

type Props = {
  className?: string;
  tag?: string;
};

/** Wordmark-first mark — signal bars + LinuxPro (no LP box monogram). */
export function Logo({ className, tag }: Props) {
  return (
    <Link href="/" className={`nav__logo ${className ?? ""}`}>
      <span className="nav__logo-mark" aria-hidden="true">
        <svg className="nav__logo-icon" viewBox="0 0 36 36" fill="none">
          {/* Soft plate */}
          <rect width="36" height="36" rx="9" fill="#07131C" />
          {/* Uptime / signal bars */}
          <rect x="8" y="20" width="4.5" height="8" rx="1.5" fill="#00D084" opacity="0.55" />
          <rect x="15.5" y="14" width="4.5" height="14" rx="1.5" fill="#00D084" opacity="0.85" />
          <rect x="23" y="8" width="4.5" height="20" rx="1.5" fill="#5CFFC0" />
        </svg>
      </span>

      <span className="nav__logo-copy">
        <span className="nav__logo-text">
          Linux<span className="nav__logo-pro">Pro</span>
        </span>
        {tag ? <span className="nav__logo-tag">{tag}</span> : null}
      </span>
    </Link>
  );
}
