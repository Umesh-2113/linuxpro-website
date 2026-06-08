import { AnimateOnScroll } from "./AnimateOnScroll";
import { FeatureIcon } from "./icons";
import { whyUsItems } from "@/lib/data";

export function WhyUs() {
  const rackLeds = [
    ["green", "green", "blink"],
    ["green", "green", "green"],
    ["green", "amber", "green"],
    ["green", "green", "green"],
    ["green", "green", "blink"],
    ["green", "green", "green"],
  ];

  return (
    <section className="why-us" id="why-us">
      <div className="container">
        <div className="why-us__layout">
          <AnimateOnScroll className="why-us__content">
            <span className="section-tag">Why LinuxPro</span>
            <h2 className="section-title">Built for Performance, Priced for Everyone</h2>
            <p className="section-desc">
              We combine enterprise infrastructure with affordable pricing to give you the best
              hosting experience.
            </p>
            <ul className="why-us__list">
              {whyUsItems.map((item) => (
                <li key={item.title}>
                  <div className="why-us__icon">
                    <FeatureIcon type={item.icon} />
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </AnimateOnScroll>
          <AnimateOnScroll delay={200} className="why-us__visual">
            <div className="server-illustration glass">
              <div className="server-rack">
                {rackLeds.map((leds, i) => (
                  <div key={i} className="rack-unit">
                    {leds.map((led, j) => (
                      <span key={j} className={`led ${led}`} />
                    ))}
                  </div>
                ))}
              </div>
              <div className="cloud-nodes">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="cloud-node">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
                    </svg>
                  </div>
                ))}
              </div>
              <div className="network-lines">
                <svg viewBox="0 0 300 100" preserveAspectRatio="none">
                  <path d="M0 50 Q75 20 150 50 T300 50" fill="none" stroke="#00D084" strokeWidth="1" opacity="0.3" />
                  <path d="M0 60 Q75 90 150 60 T300 60" fill="none" stroke="#00D084" strokeWidth="1" opacity="0.2" />
                </svg>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
