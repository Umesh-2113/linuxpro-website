"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { navLinks } from "@/lib/data";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`header${scrolled ? " scrolled" : ""}`} id="header">
      <nav className="nav container">
        <Logo />
        <button
          className={`nav__toggle${menuOpen ? " active" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
        <ul className={`nav__menu${menuOpen ? " active" : ""}`} id="navMenu">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="nav__link" onClick={closeMenu}>
                {link.label}
              </Link>
            </li>
          ))}
          <li className="nav__menu-cta">
            <Link href="/login" className="nav__link" onClick={closeMenu}>
              Login
            </Link>
          </li>
          <li className="nav__menu-cta">
            <Link
              href="/client"
              className="btn btn--primary btn--block"
              onClick={closeMenu}
            >
              Client Area
            </Link>
          </li>
        </ul>
        <div className="nav__actions">
          <ThemeToggle />
          <Link href="/login" className="btn btn--ghost btn--sm">
            Login
          </Link>
          <Link href="/client" className="btn btn--primary btn--sm">
            Client Area
          </Link>
        </div>
      </nav>
    </header>
  );
}
