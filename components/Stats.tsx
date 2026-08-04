"use client";

import { useEffect, useRef } from "react";
import { AnimateOnScroll } from "./AnimateOnScroll";
import { stats } from "@/lib/data";

function Counter({
  value,
  decimals,
  display,
}: {
  value: number | null;
  decimals: number;
  display?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || animated.current) return;

    if (display) {
      el.textContent = display;
      return;
    }

    if (value === null) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || animated.current) return;
        animated.current = true;

        const target = value;
        const duration = 2000;
        const start = performance.now();

        const update = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = target * eased;
          el.textContent =
            decimals > 0 ? current.toFixed(decimals) : Math.floor(current).toLocaleString();
          if (progress < 1) requestAnimationFrame(update);
        };

        requestAnimationFrame(update);
        observer.disconnect();
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, decimals, display]);

  return <span ref={ref} className="stat-item__number" />;
}

export function Stats() {
  return (
    <section className="ol-section ol-stats-band" id="stats">
      <div className="container">
        <div className="ol-stats-band__grid">
          {stats.map((stat, i) => (
            <AnimateOnScroll key={stat.label} delay={i * 100} asChild>
              <div className="stat-item glass">
                <Counter value={stat.value} decimals={stat.decimals} display={stat.display} />
                <span className="stat-item__suffix">{stat.suffix}</span>
                <span className="stat-item__label">{stat.label}</span>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
