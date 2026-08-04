import { AnimateOnScroll } from "@/components/AnimateOnScroll";
import { homePerformanceStats } from "@/lib/home-data";

export function HomePerformance() {
  return (
    <section className="ol-section ol-performance" id="performance">
      <div className="container">
        <AnimateOnScroll className="ol-section-head ol-section-head--center">
          <span className="ol-section-tag">Performance</span>
          <h2>Unmatched Speed at Affordable Prices</h2>
          <p>
            Enterprise-grade hardware from trusted providers — without the enterprise markup.
          </p>
        </AnimateOnScroll>

        <div className="ol-performance__grid">
          {homePerformanceStats.map((stat, i) => (
            <AnimateOnScroll key={stat.label} delay={i * 70} asChild>
              <div className="ol-performance-stat glass">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        <AnimateOnScroll delay={200}>
          <div className="ol-performance__specs glass">
            <div>
              <h3>Latest Generation CPUs</h3>
              <p>Intel Xeon and AMD EPYC processors for maximum throughput.</p>
            </div>
            <div>
              <h3>High-Speed DDR4 RAM</h3>
              <p>ECC memory for reliability and fast data access on every tier.</p>
            </div>
            <div>
              <h3>NVMe SSD Storage</h3>
              <p>Ultra-fast NVMe drives for rapid I/O and application loading.</p>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
