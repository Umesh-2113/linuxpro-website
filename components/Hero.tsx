import Link from "next/link";
import { AnimateOnScroll } from "./AnimateOnScroll";
import { DashboardMockup } from "./DashboardMockup";

export function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero__bg">
        <div className="hero__grid" />
        <div className="hero__glow hero__glow--1" />
        <div className="hero__glow hero__glow--2" />
        <svg className="hero__illustration hero__illustration--left" viewBox="0 0 200 200" aria-hidden="true">
          <rect x="40" y="30" width="120" height="140" rx="4" fill="none" stroke="#00D084" strokeWidth="1" opacity="0.3" />
          <rect x="50" y="45" width="100" height="12" rx="2" fill="#00D084" opacity="0.2" />
          <rect x="50" y="65" width="100" height="12" rx="2" fill="#00D084" opacity="0.15" />
          <rect x="50" y="85" width="100" height="12" rx="2" fill="#00D084" opacity="0.2" />
          <circle cx="58" cy="51" r="3" fill="#00D084" opacity="0.6" />
          <circle cx="58" cy="71" r="3" fill="#00D084" opacity="0.4" />
          <circle cx="58" cy="91" r="3" fill="#00D084" opacity="0.6" />
        </svg>
        <svg className="hero__illustration hero__illustration--right" viewBox="0 0 200 200" aria-hidden="true">
          <ellipse cx="100" cy="80" rx="60" ry="30" fill="none" stroke="#00D084" strokeWidth="1" opacity="0.25" />
          <ellipse cx="100" cy="100" rx="80" ry="40" fill="none" stroke="#00D084" strokeWidth="1" opacity="0.15" />
          <path d="M70 100 Q100 60 130 100" fill="none" stroke="#00D084" strokeWidth="1.5" opacity="0.4" />
          <circle cx="100" cy="75" r="8" fill="#00D084" opacity="0.3" />
        </svg>
      </div>
      <div className="container hero__container">
        <AnimateOnScroll className="hero__content">
          <div className="hero__badge">
            <span className="hero__badge-dot" />
            99.99% Uptime Guaranteed
          </div>
          <h1 className="hero__title">Powerful Linux Hosting for Modern Businesses</h1>
          <p className="hero__subtitle">
            High-performance VPS, Cloud, and Dedicated Servers with 99.99% uptime.
          </p>
          <div className="hero__cta">
            <Link href="#plans" className="btn btn--primary btn--lg">
              Get Started
            </Link>
            <Link href="#plans" className="btn btn--outline btn--lg">
              View Plans
            </Link>
          </div>
          <div className="hero__trust">
            <div className="hero__trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              DDoS Protected
            </div>
            <div className="hero__trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              Instant Deploy
            </div>
            <div className="hero__trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              24/7 Support
            </div>
          </div>
        </AnimateOnScroll>
        <AnimateOnScroll delay={200} className="hero__dashboard">
          <DashboardMockup />
        </AnimateOnScroll>
      </div>
    </section>
  );
}
