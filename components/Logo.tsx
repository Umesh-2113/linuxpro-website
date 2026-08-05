"use client";

import Link from "next/link";
import { useId } from "react";

type Props = {
  className?: string;
  tag?: string;
};

export function Logo({ className, tag }: Props) {
  const uid = useId().replace(/:/g, "");
  const grad = `lpMark-${uid}`;
  const ring = `lpRing-${uid}`;

  return (
    <Link href="/" className={`nav__logo ${className ?? ""}`}>
      <span className="nav__logo-mark" aria-hidden="true">
        <svg className="nav__logo-icon" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id={grad} x1="12" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5CFFC0" />
              <stop offset="0.55" stopColor="#00D084" />
              <stop offset="1" stopColor="#00A86B" />
            </linearGradient>
            <linearGradient id={ring} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#9AFFD8" stopOpacity="0.85" />
              <stop offset="1" stopColor="#00D084" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          <rect x="2" y="2" width="44" height="44" rx="14" fill="#070D16" />
          <rect
            x="2.75"
            y="2.75"
            width="42.5"
            height="42.5"
            rx="13.25"
            stroke={`url(#${ring})`}
            strokeWidth="1.5"
            fill="none"
          />

          {/* L */}
          <path
            d="M12 12.5h5.4v18.2H28.5V36H12V12.5Z"
            fill="#F7FFFB"
          />

          {/* P */}
          <path
            d="M23.2 12.5H32.2C37.1 12.5 40.5 15.7 40.5 20.5C40.5 25.3 37.1 28.5 32.2 28.5H28.6V36H23.2V12.5ZM28.6 17.1V23.9H32C34.1 23.9 35.3 22.5 35.3 20.5C35.3 18.5 34.1 17.1 32 17.1H28.6Z"
            fill={`url(#${grad})`}
          />

          {/* Signal dot */}
          <circle cx="38.2" cy="35.2" r="2.4" fill={`url(#${grad})`} />
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
