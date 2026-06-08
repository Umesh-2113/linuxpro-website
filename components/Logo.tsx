"use client";

import Link from "next/link";
import { useId } from "react";

export function Logo({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const grad = `lp-grad-${uid}`;
  const glow = `lp-glow-${uid}`;
  const shine = `lp-shine-${uid}`;
  const ring = `lp-ring-${uid}`;

  return (
    <Link href="/" className={`nav__logo ${className ?? ""}`}>
      <span className="nav__logo-mark" aria-hidden="true">
        <svg className="nav__logo-icon" viewBox="0 0 44 44" fill="none">
          <defs>
            <linearGradient id={grad} x1="6" y1="4" x2="38" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00f0a0" />
              <stop offset="0.45" stopColor="#00D084" />
              <stop offset="1" stopColor="#007a52" />
            </linearGradient>
            <linearGradient id={glow} x1="22" y1="0" x2="22" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id={shine} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(34 10) rotate(130) scale(28)">
              <stop stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={ring} x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7dffd8" stopOpacity="0.9" />
              <stop offset="1" stopColor="#00D084" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          <rect x="1" y="1" width="42" height="42" rx="13" fill={`url(#${grad})`} />
          <rect x="1" y="1" width="42" height="42" rx="13" fill={`url(#${glow})`} />
          <rect x="1" y="1" width="42" height="42" rx="13" fill={`url(#${shine})`} />
          <rect
            x="1.5"
            y="1.5"
            width="41"
            height="41"
            rx="12.5"
            fill="none"
            stroke={`url(#${ring})`}
            strokeWidth="1"
          />

          <rect x="9" y="9" width="26" height="26" rx="8" fill="var(--logo-panel, #07111f)" opacity="0.92" />

          <path
            d="M15.5 17.5 L19 22 L15.5 26.5"
            stroke="var(--logo-accent, #00f0a0)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <rect x="21" y="16" width="11" height="2.6" rx="1.3" fill="var(--logo-lines, #ffffff)" opacity="0.92" />
          <rect x="21" y="20.7" width="9" height="2.6" rx="1.3" fill="var(--logo-lines, #ffffff)" opacity="0.65" />
          <rect x="21" y="25.4" width="7" height="2.6" rx="1.3" fill="var(--logo-lines, #ffffff)" opacity="0.4" />

          <circle cx="31.5" cy="31.5" r="3.5" fill="#00D084" opacity="0.2" />
          <circle cx="31.5" cy="31.5" r="2" fill="#00f0a0" />
          <circle cx="31.5" cy="31.5" r="5" stroke="#00f0a0" strokeOpacity="0.35" strokeWidth="1" />
        </svg>
      </span>

      <span className="nav__logo-text">
        Linux<span className="nav__logo-pro">Pro</span>
      </span>
    </Link>
  );
}
