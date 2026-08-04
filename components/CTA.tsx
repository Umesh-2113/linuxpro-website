import Link from "next/link";
import { AnimateOnScroll } from "./AnimateOnScroll";
import { siteContact, whatsappChatUrl } from "@/lib/contact";

export function CTA() {
  const whatsappUrl = whatsappChatUrl(siteContact.phone);

  return (
    <section className="ol-cta" id="contact">
      <div className="container">
        <AnimateOnScroll>
          <div className="ol-cta__card glass">
            <span className="ol-section-tag">Get Started Today</span>
            <h2>Ready to Launch Your Linux VPS?</h2>
            <p>
              Join thousands of businesses on LinuxPro. Create a free account, top up your wallet,
              and deploy from live IP stock in minutes.
            </p>
            <div className="ol-cta__buttons">
              <Link href="/register" className="btn btn--primary btn--lg">
                Create Free Account
              </Link>
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  className="btn btn--outline btn--lg"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp Support
                </a>
              ) : (
                <Link href="/contact" className="btn btn--outline btn--lg">
                  Contact Sales
                </Link>
              )}
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
