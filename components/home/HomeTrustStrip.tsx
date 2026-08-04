import { AnimateOnScroll } from "@/components/AnimateOnScroll";
import { homeTrustMetrics } from "@/lib/home-data";

export function HomeTrustStrip() {
  return (
    <section className="ol-trust" aria-label="Trust metrics">
      <div className="container">
        <AnimateOnScroll>
          <div className="ol-trust__grid">
            {homeTrustMetrics.map((item) => (
              <div key={item.label} className="ol-trust__item">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
