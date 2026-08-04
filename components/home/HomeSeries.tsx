import Link from "next/link";
import { AnimateOnScroll } from "@/components/AnimateOnScroll";
import { homeSeries } from "@/lib/home-data";

export function HomeSeries() {
  return (
    <section className="ol-section ol-series" id="series">
      <div className="container">
        <AnimateOnScroll className="ol-section-head">
          <span className="ol-section-tag">Server Series</span>
          <h2>Popular Linux Series</h2>
          <p>
            Each series is optimized for a specific use case — VPS performance, Linux workloads,
            or rotating proxy IPs.
          </p>
        </AnimateOnScroll>

        <div className="ol-series__grid">
          {homeSeries.map((series, i) => (
            <AnimateOnScroll key={series.name} delay={i * 80} asChild>
              <article className="ol-series-card glass">
                <span className="ol-series-card__tag">{series.tag}</span>
                <h3>{series.name}</h3>
                <p>{series.desc}</p>
                <code className="ol-series-card__ip">{series.ipHint}</code>
                <Link href={series.href} className="ol-series-card__link">
                  View stock →
                </Link>
              </article>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
