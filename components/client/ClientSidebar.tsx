"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { oceanClientNav, oceanPuttyLinks, type ClientNavItem } from "@/lib/client-ocean-data";
import { signOut } from "next-auth/react";
import { logout } from "@/lib/auth";

function NavIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    grid: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
    plans: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
    linux: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
    windows: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="8" height="8" />
        <rect x="13" y="3" width="8" height="8" />
        <rect x="3" y="13" width="8" height="8" />
        <rect x="13" y="13" width="8" height="8" />
      </svg>
    ),
    proxy: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    orders: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
      </svg>
    ),
    history: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    wallet: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12V7H5a2 2 0 010-4h14v4" />
        <path d="M3 5v14a2 2 0 002 2h16v-5" />
        <path d="M18 12a2 2 0 100 4h4v-4h-4z" />
      </svg>
    ),
    server: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    chat: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    download: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
    ),
  };
  return <>{icons[type] ?? icons.grid}</>;
}

function isNavActive(item: ClientNavItem, pathname: string, tab: string | null): boolean {
  if (item.href.includes("?tab=history")) {
    return pathname === "/client/orders" && tab === "history";
  }
  if (item.href === "/client/orders") {
    return pathname === "/client/orders" && tab !== "history";
  }
  if (item.href === "/client/ip-stock") {
    return pathname === "/client/ip-stock";
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const navGroups: { key: ClientNavItem["group"]; label: string }[] = [
  { key: "main", label: "Main" },
  { key: "plans", label: "Plans" },
  { key: "account", label: "Account" },
];

export function ClientSidebar({
  userName,
  userEmail,
  userAvatar,
}: {
  userName: string;
  userEmail?: string;
  userAvatar?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    logout();
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <>
      <div className="sidebar-mobilebar ocean-mobilebar">
        <button
          type="button"
          className="sidebar-mobile-toggle"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <Logo />
        <ThemeToggle className="sidebar-mobilebar__theme" />
      </div>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden />}
      <aside className={`client-sidebar ocean-sidebar glass${open ? " sidebar--open" : ""}`}>
        <button
          type="button"
          className="sidebar-close"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
        <div className="client-sidebar__brand ocean-sidebar__brand">
          <Logo />
          <span className="ocean-sidebar__tag">Client Panel</span>
        </div>
        <div className="client-sidebar__user ocean-sidebar__user">
          <div className="client-sidebar__avatar">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatar} alt="" />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <strong>{userName}</strong>
            <span>{userEmail ?? "Client Area"}</span>
          </div>
        </div>

        <nav className="client-sidebar__nav ocean-sidebar__nav">
          {navGroups.map((group) => (
            <div key={group.key} className="ocean-nav-group">
              <span className="ocean-nav-group__label">{group.label}</span>
              {oceanClientNav
                .filter((item) => item.group === group.key)
                .map((item) => {
                  const active = isNavActive(item, pathname, tab);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`client-sidebar__link ocean-sidebar__link${active ? " active" : ""}`}
                    >
                      <NavIcon type={item.icon} />
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          ))}

          <div className="ocean-nav-group">
            <span className="ocean-nav-group__label">PuTTY / SSH</span>
            {oceanPuttyLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="client-sidebar__link ocean-sidebar__link ocean-sidebar__link--external"
                target="_blank"
                rel="noopener noreferrer"
              >
                <NavIcon type="download" />
                {link.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="client-sidebar__footer ocean-sidebar__footer">
          <ThemeToggle className="client-sidebar__theme" showLabel />
          <Link href="/" className="client-sidebar__link ocean-sidebar__link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Back to Website
          </Link>
          <button
            type="button"
            className="client-sidebar__link client-sidebar__logout ocean-sidebar__link"
            onClick={handleLogout}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
