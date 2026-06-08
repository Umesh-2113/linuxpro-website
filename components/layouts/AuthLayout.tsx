import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PageAmbient } from "@/components/ui/PageAmbient";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="auth-page site-shell">
      <PageAmbient variant="auth" />
      <div className="auth-page__panel auth-page__panel--form glass">
        <div className="auth-page__form-wrap">
          <Logo />
          <h1 className="auth-page__title">{title}</h1>
          <p className="auth-page__subtitle">{subtitle}</p>
          {children}
        </div>
      </div>
      <div className="auth-page__panel auth-page__panel--visual">
        <div className="auth-page__visual-content">
          <div className="auth-page__badge">
            <span className="hero__badge-dot" />
            Trusted by 10,000+ customers
          </div>
          <h2>Enterprise Linux hosting at your fingertips</h2>
          <p>
            Manage VPS, cloud servers, domains, and billing from one powerful control panel.
          </p>
          <ul className="auth-page__features">
            <li>99.99% uptime SLA</li>
            <li>Instant server deployment</li>
            <li>24/7 expert support</li>
            <li>NVMe SSD performance</li>
          </ul>
        </div>
        <div className="auth-page__glow" />
      </div>
      <Link href="/" className="auth-page__back">
        ← Back to home
      </Link>
    </div>
  );
}
