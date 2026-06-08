import Link from "next/link";
import { AnimateOnScroll } from "./AnimateOnScroll";

export function CTA() {
  return (
    <section className="cta" id="contact">
      <div className="container">
        <AnimateOnScroll>
          <div className="cta__card glass">
            <h2>Ready to Power Your Business?</h2>
            <p>
              Join 10,000+ businesses running on LinuxPro infrastructure. Deploy your first server
              in under 60 seconds.
            </p>
            <div className="cta__buttons">
              <Link href="/register" className="btn btn--primary btn--lg">
                Get Started Now
              </Link>
              <Link href="/contact" className="btn btn--outline btn--lg">
                Contact Sales
              </Link>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
