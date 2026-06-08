import Link from "next/link";

type Crumb = { label: string; href?: string };

export function PageHero({
  tag,
  title,
  description,
  breadcrumbs,
}: {
  tag?: string;
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
}) {
  return (
    <section className="page-hero">
      <div className="page-hero__bg">
        <div className="hero__grid" />
        <div className="hero__glow hero__glow--1" />
      </div>
      <div className="container page-hero__content">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="page-hero__breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.label}>
                {i > 0 && <span className="page-hero__sep">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href}>{crumb.label}</Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {tag && <span className="section-tag">{tag}</span>}
        <h1 className="page-hero__title">{title}</h1>
        {description && <p className="page-hero__desc">{description}</p>}
      </div>
    </section>
  );
}
