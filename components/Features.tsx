import { AnimateOnScroll } from "./AnimateOnScroll";
import { FeatureIcon } from "./icons";
import { features } from "@/lib/data";

export function Features() {
  return (
    <section className="features" id="features">
      <div className="container">
        <AnimateOnScroll className="section-header">
          <span className="section-tag">Features</span>
          <h2 className="section-title">Everything You Need to Succeed</h2>
          <p className="section-desc">
            Enterprise-grade features included with every plan at no extra cost.
          </p>
        </AnimateOnScroll>
        <div className="features__grid">
          {features.map((f, i) => (
            <AnimateOnScroll key={f.title} delay={i * 50} asChild>
              <div className="feature-card glass">
                <div className="feature-card__icon">
                  <FeatureIcon type={f.icon} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
