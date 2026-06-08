import type { Metadata } from "next";
import { MarketingLayout } from "@/components/layouts/MarketingLayout";
import { PageHero } from "@/components/PageHero";
import { siteContact } from "@/lib/contact";
import { getSiteDomain } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy — LinuxPro",
  description:
    "How LinuxPro collects, uses, stores, and protects your personal data when you use our hosting services.",
};

const LAST_UPDATED = "8 June 2026";

export default function PrivacyPage() {
  const siteDomain = getSiteDomain();

  return (
    <MarketingLayout>
      <PageHero
        tag="Legal"
        title="Privacy Policy"
        description="How we collect, use, and protect your data."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]}
      />
      <section className="inner-page">
        <div className="container legal-page">
          <p className="legal-page__updated">Last updated: {LAST_UPDATED}</p>

          <article className="legal-page__article glass">
            <h2>1. Introduction</h2>
            <p>
              LinuxPro Technologies Pvt. Ltd. (&ldquo;LinuxPro&rdquo;, &ldquo;we&rdquo;,
              &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates{" "}
              <strong>{siteDomain}</strong> and provides VPS, Linux, proxy, and dedicated
              server hosting services. This Privacy Policy explains what personal
              information we collect, how we use it, and the rights you have under the
              Information Technology Act, 2000, IT Rules, 2011, and the Digital Personal
              Data Protection Act, 2023.
            </p>

            <h2>2. Information We Collect</h2>
            <ul>
              <li>
                <strong>Account data:</strong> name, email address, phone number, and a
                hashed password when you register.
              </li>
              <li>
                <strong>Billing data:</strong> order amount, transaction ID, and payment
                status. Card numbers and UPI IDs are processed{" "}
                <em>only</em> by our PCI-DSS compliant payment gateway (Cashfree
                Payments) — we never see or store them.
              </li>
              <li>
                <strong>Service data:</strong> the IP series, region, OS, and
                configuration you order so we can provision and deliver them to you.
              </li>
              <li>
                <strong>Support data:</strong> messages you send through our contact
                form, live chat, or support tickets.
              </li>
              <li>
                <strong>Technical data:</strong> IP address, browser type, device info,
                and pages visited. Used only for security and analytics.
              </li>
            </ul>

            <h2>3. How We Use Your Data</h2>
            <ul>
              <li>To create your account and deliver the services you purchase.</li>
              <li>To process payments through Cashfree and send invoices/receipts.</li>
              <li>To send transactional emails (login, order confirmation, delivery, etc.).</li>
              <li>To provide customer support and respond to your queries.</li>
              <li>To improve our site, detect abuse, and comply with legal obligations.</li>
            </ul>

            <h2>4. Sharing &amp; Disclosure</h2>
            <p>
              We do <strong>not</strong> sell or rent your personal data. We share only
              what is strictly necessary with:
            </p>
            <ul>
              <li>
                <strong>Cashfree Payments</strong> — for processing your payments
                securely under their{" "}
                <a
                  href="https://www.cashfree.com/privacy-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
                .
              </li>
              <li>
                Upstream data-center and IP providers — only the technical details
                required to provision the server you ordered.
              </li>
              <li>
                Government / law enforcement — when legally required by a valid order
                from an Indian authority.
              </li>
            </ul>

            <h2>5. Data Retention</h2>
            <p>
              Account and order records are retained for as long as your account is
              active and for up to 7 years after closure to comply with Indian tax and
              audit laws. You may request deletion (see Section 8).
            </p>

            <h2>6. Security</h2>
            <p>
              Passwords are stored hashed. Card details are tokenised by Cashfree under
              PCI-DSS Level 1 standards. All traffic to {siteDomain} is encrypted with
              HTTPS/TLS.
            </p>

            <h2>7. Cookies</h2>
            <p>
              We use only essential cookies for authentication (login session). We do
              not use third-party advertising cookies.
            </p>

            <h2>8. Your Rights</h2>
            <p>
              You can request access, correction, or deletion of your personal data, or
              withdraw consent, by emailing{" "}
              <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>. We will
              respond within 30 days.
            </p>

            <h2>9. Grievance Officer</h2>
            <p>
              As per the IT Rules, 2011, the Grievance Officer can be reached at:
            </p>
            <ul>
              <li>Email: <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a></li>
              <li>
                Phone:{" "}
                <a href={`tel:${siteContact.phone.replace(/\s/g, "")}`}>
                  {siteContact.phoneDisplay}
                </a>
              </li>
              <li>Address: LinuxPro Technologies Pvt. Ltd., Mumbai, Maharashtra, India</li>
            </ul>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The latest version
              will always be available at <strong>{siteDomain}/privacy</strong> with the
              &ldquo;Last updated&rdquo; date.
            </p>

            <h2>11. Contact</h2>
            <p>
              Questions? Reach us at{" "}
              <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a> or{" "}
              <a href={`tel:${siteContact.phone.replace(/\s/g, "")}`}>
                {siteContact.phoneDisplay}
              </a>
              .
            </p>
          </article>
        </div>
      </section>
    </MarketingLayout>
  );
}
