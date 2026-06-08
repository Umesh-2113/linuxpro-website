import type { Metadata } from "next";
import { MarketingLayout } from "@/components/layouts/MarketingLayout";
import { PageHero } from "@/components/PageHero";
import { ContactForm } from "@/components/ContactForm";
import { siteContact } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact Us — LinuxPro",
  description: "Contact LinuxPro sales and support. We're available 24/7.",
};

export default function ContactPage() {
  return (
    <MarketingLayout>
      <PageHero
        tag="Contact"
        title="Get in Touch"
        description="Our team is available 24/7 to help with sales, support, and migrations."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />
      <section className="inner-page">
        <div className="container contact-grid">
          <ContactForm />
          <div className="contact-info">
            <div className="contact-card glass">
              <h3>Helpdesk</h3>
              <p>
                <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
              </p>
              <p>
                <a href={`tel:${siteContact.phone.replace(/\s/g, "")}`}>
                  {siteContact.phoneDisplay}
                </a>
              </p>
            </div>
            <div className="contact-card glass">
              <h3>Sales</h3>
              <p>
                <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
              </p>
              <p>{siteContact.phoneDisplay}</p>
            </div>
            <div className="contact-card glass">
              <h3>Support</h3>
              <p>24/7 live chat &amp; tickets</p>
              <p>
                <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
              </p>
            </div>
            <div className="contact-card glass">
              <h3>Head Office</h3>
              <p>LinuxPro Technologies Pvt. Ltd.</p>
              <p>Mumbai, Maharashtra, India</p>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
