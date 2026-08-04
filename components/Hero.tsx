import Link from "next/link";
import { AnimateOnScroll } from "./AnimateOnScroll";
import { DashboardMockup } from "./DashboardMockup";
import { homeHeroPills } from "@/lib/home-data";
import { siteContact, whatsappChatUrl } from "@/lib/contact";

export function Hero() {
  const whatsappUrl = whatsappChatUrl(siteContact.phone);

  return (
    <section className="ol-hero" id="hero">
      <div className="ol-hero__bg" aria-hidden="true">
        <div className="ol-hero__grid" />
        <div className="ol-hero__glow ol-hero__glow--1" />
        <div className="ol-hero__glow ol-hero__glow--2" />
      </div>

      <div className="container ol-hero__container">
        <AnimateOnScroll className="ol-hero__content">
          <div className="ol-hero__badges">
            <span className="ol-hero__badge">
              <span className="ol-hero__badge-dot" />
              Most Affordable Linux VPS
            </span>
            <span className="ol-hero__badge ol-hero__badge--muted">Premium Quality</span>
          </div>

          <h1 className="ol-hero__title">
            Most Affordable <span className="ol-gradient-text">Premium Linux</span> VPS Hosting
          </h1>

          <p className="ol-hero__subtitle">
            High-performance VPS, Linux servers, and rotating proxy IPs — enterprise-grade
            infrastructure at prices up to 40% lower than the competition.
          </p>

          <ul className="ol-hero__pills">
            {homeHeroPills.map((pill) => (
              <li key={pill}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {pill}
              </li>
            ))}
          </ul>

          <div className="ol-hero__cta">
            <Link href="/register" className="btn btn--primary btn--lg">
              Get Started Free
            </Link>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                className="btn btn--outline btn--lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                Chat for Best Price
              </a>
            ) : (
              <Link href="/contact" className="btn btn--outline btn--lg">
                Contact Sales
              </Link>
            )}
          </div>

          <div className="ol-hero__trust">
            <div className="ol-hero__trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              DDoS Protected
            </div>
            <div className="ol-hero__trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              Instant Setup
            </div>
            <div className="ol-hero__trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              24/7 Support
            </div>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={200} className="ol-hero__visual">
          <DashboardMockup />
        </AnimateOnScroll>
      </div>
    </section>
  );
}
