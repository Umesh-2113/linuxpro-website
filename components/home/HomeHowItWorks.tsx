import Link from "next/link";
import { AnimateOnScroll } from "@/components/AnimateOnScroll";
import { homeHowSteps } from "@/lib/home-data";

export function HomeHowItWorks() {
  return (
    <section className="ol-section ol-how" id="how">
      <div className="container">
        <AnimateOnScroll className="ol-section-head">
          <span className="ol-section-tag">How It Works</span>
          <h2>Premium VPS, Fully Managed by LinuxPro</h2>
          <p>
            Reliable infrastructure from trusted partners — plus wallet billing, live IP stock,
            and human support.
          </p>
        </AnimateOnScroll>

        <div className="ol-how__steps">
          {homeHowSteps.map((step, i) => (
            <AnimateOnScroll key={step.step} delay={i * 100} asChild>
              <article className="ol-how-step glass">
                <span className="ol-how-step__num">{step.step}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </article>
            </AnimateOnScroll>
          ))}
        </div>

        <AnimateOnScroll delay={250}>
          <div className="ol-how__cta">
            <Link href="/register" className="btn btn--primary btn--lg">
              Create Free Account
            </Link>
            <Link href="/client/ip-stock" className="btn btn--outline btn--lg">
              Browse Live Stock
            </Link>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
