"use client";

import Link from "next/link";
import { useId } from "react";

type Props = {
  className?: string;
  tag?: string;
};

export function Logo({ className, tag }: Props) {
  const uid = useId().replace(/:/g, "");
  const glow = `lpGlow-${uid}`;

  return (
    <Link href="/" className={`nav__logo ${className ?? ""}`}>
      <span className="nav__logo-mark" aria-hidden="true">
        <svg className="nav__logo-icon" viewBox="0 0 40 40" fill="none">
          <defs>
            <linearGradient id={glow} x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3DFFB0" />
              <stop offset="1" stopColor="#00A86B" />
            </linearGradient>
          </defs>
          {/* Plate */}
          <rect x="1" y="1" width="38" height="38" rx="10" fill="#061018" />
          <rect
            x="1.5"
            y="1.5"
            width="37"
            height="37"
            rx="9.5"
            stroke={`url(#${glow})`}
            strokeOpacity="0.55"
            strokeWidth="1"
          />
          {/* Accent bar */}
          <rect x="1" y="1" width="4" height="38" rx="2" fill={`url(#${glow})`} />
          {/* Bold L */}
          <path
            d="M11 9.5h4.2v16.2H24.5V30H11V9.5Z"
            fill="#F4FFF9"
          />
          {/* Compact P block */}
          <path
            d="M20.2 9.5H26.8c3.55 0 5.9 2.15 5.9 5.35 0 3.2-2.35 5.35-5.9 5.35H24.4V30h-4.2V9.5Zm4.2 3.35v4h2.35c1.35 0 2.15-.85 2.15-2s-.8-2-2.15-2H24.4Z"
            fill={`url(#${glow})`}
          />
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
