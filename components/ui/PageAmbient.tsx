export function PageAmbient({ variant = "default" }: { variant?: "default" | "auth" | "minimal" }) {
  return (
    <div className={`page-ambient page-ambient--${variant}`} aria-hidden>
      <div className="page-ambient__mesh" />
      <div className="page-ambient__grid" />
      <div className="page-ambient__orb page-ambient__orb--1" />
      <div className="page-ambient__orb page-ambient__orb--2" />
      <div className="page-ambient__orb page-ambient__orb--3" />
      {variant !== "minimal" && <div className="page-ambient__orb page-ambient__orb--4" />}
    </div>
  );
}
