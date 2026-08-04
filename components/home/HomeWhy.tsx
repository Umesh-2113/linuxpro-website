import { AnimateOnScroll } from "@/components/AnimateOnScroll";
import { homeWhyCards } from "@/lib/home-data";

export function HomeWhy() {
  return (
    <section className="ol-section ol-why" id="why">
      <div className="container">
        <AnimateOnScroll className="ol-section-head">
          <span className="ol-section-tag">Why LinuxPro</span>
          <h2>Affordable Premium Linux VPS</h2>
          <p>
            Professional hosting features without the enterprise price tag. Quality infrastructure,
            managed by a team that actually responds.
          </p>
        </AnimateOnScroll>

        <div className="ol-why__grid">
          {homeWhyCards.map((card, i) => (
            <AnimateOnScroll key={card.title} delay={i * 60} asChild>
              <article className="ol-why-card glass">
                <span className="ol-why-card__badge">{card.badge}</span>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </article>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
