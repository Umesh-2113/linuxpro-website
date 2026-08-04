import { AnimateOnScroll } from "@/components/AnimateOnScroll";
import { homeSecurityItems } from "@/lib/home-data";

export function HomeSecurity() {
  return (
    <section className="ol-section ol-security" id="security">
      <div className="container">
        <AnimateOnScroll className="ol-section-head ol-section-head--center">
          <span className="ol-section-tag">Security</span>
          <h2>Enterprise Security at Every Price Point</h2>
          <p>Professional-grade protection on every plan — not sold as an expensive add-on.</p>
        </AnimateOnScroll>

        <div className="ol-security__grid">
          {homeSecurityItems.map((item, i) => (
            <AnimateOnScroll key={item.title} delay={i * 80} asChild>
              <article className="ol-security-card glass">
                <div className="ol-security-card__icon" aria-hidden>
                  🛡️
                </div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
