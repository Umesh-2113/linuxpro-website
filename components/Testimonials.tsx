import { AnimateOnScroll } from "./AnimateOnScroll";
import { StarIcon } from "./icons";
import { testimonials } from "@/lib/data";

export function Testimonials() {
  return (
    <section className="testimonials" id="testimonials">
      <div className="container">
        <AnimateOnScroll className="section-header">
          <span className="section-tag">Testimonials</span>
          <h2 className="section-title">Trusted by Thousands</h2>
          <p className="section-desc">See what our customers say about their LinuxPro experience.</p>
        </AnimateOnScroll>
        <div className="testimonials__grid">
          {testimonials.map((t, i) => (
            <AnimateOnScroll key={t.name} delay={i * 100} asChild>
              <article className="testimonial-card glass">
                <div className="testimonial-card__stars">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <StarIcon key={j} />
                  ))}
                </div>
                <p className="testimonial-card__text">&ldquo;{t.text}&rdquo;</p>
                <div className="testimonial-card__author">
                  <div
                    className="testimonial-card__avatar"
                    style={{ background: t.gradient }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </article>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
