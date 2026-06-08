import type { Metadata } from "next";
import { MarketingLayout } from "@/components/layouts/MarketingLayout";
import { PageHero } from "@/components/PageHero";
import { siteContact } from "@/lib/contact";
import { getSiteDomain } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions — LinuxPro",
  description:
    "Terms and conditions governing your use of LinuxPro hosting, VPS, Linux server, and proxy services.",
};

const LAST_UPDATED = "8 June 2026";

export default function TermsPage() {
  const siteDomain = getSiteDomain();

  return (
    <MarketingLayout>
      <PageHero
        tag="Legal"
        title="Terms & Conditions"
        description="The rules that govern your use of LinuxPro services."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Terms & Conditions" }]}
      />
      <section className="inner-page">
        <div className="container legal-page">
          <p className="legal-page__updated">Last updated: {LAST_UPDATED}</p>

          <article className="legal-page__article glass">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing, registering on, or purchasing from{" "}
              <strong>{siteDomain}</strong> (the &ldquo;Service&rdquo;), you agree to be
              bound by these Terms &amp; Conditions and our Privacy Policy. If you do
              not agree, do not use the Service.
            </p>

            <h2>2. Eligibility</h2>
            <p>
              You must be at least 18 years old and capable of entering a legally binding
              contract under the Indian Contract Act, 1872. Business accounts must be
              registered in the name of an authorised representative.
            </p>

            <h2>3. Account Responsibilities</h2>
            <ul>
              <li>Keep your login credentials confidential — you are responsible for all activity under your account.</li>
              <li>Provide accurate billing information, including a valid Indian mobile number for KYC and payment.</li>
              <li>Notify us immediately at <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a> if you suspect unauthorised access.</li>
            </ul>

            <h2>4. Services Provided</h2>
            <p>
              LinuxPro provides monthly-billed VPS, Linux servers, dedicated servers,
              proxy IPs, and related cloud services. Specifications (RAM, vCPU, storage,
              region, OS) are displayed at the time of purchase. We reserve the right to
              upgrade, modify, or discontinue any plan with reasonable prior notice.
            </p>

            <h2>5. Pricing &amp; Payment</h2>
            <ul>
              <li>All prices are listed in Indian Rupees (₹) inclusive of applicable taxes unless stated otherwise.</li>
              <li>Payments are processed by <strong>Cashfree Payments</strong>, a RBI-licensed payment aggregator.</li>
              <li>Promotional codes (if any) apply only to the RAM tier specified by the admin and cannot be combined.</li>
              <li>Services are activated only after successful payment confirmation.</li>
            </ul>

            <h2>6. Acceptable Use</h2>
            <p>You agree <strong>not</strong> to use LinuxPro services for:</p>
            <ul>
              <li>Spamming, phishing, malware distribution, or any illegal activity under Indian law.</li>
              <li>Hosting CSAM, pirated material, or content infringing third-party IP.</li>
              <li>Running DDoS attacks, port-scanning, or vulnerability exploitation against third parties.</li>
              <li>Cryptocurrency mining unless explicitly permitted in writing.</li>
              <li>Resale of services to end-users without disclosing LinuxPro as the upstream provider.</li>
            </ul>
            <p>
              Violations may result in immediate suspension or termination without refund
              and reporting to the relevant authorities.
            </p>

            <h2>7. Service Delivery &amp; Uptime</h2>
            <p>
              Servers are typically delivered within a few minutes of payment
              confirmation. See our <a href="/shipping">Service Delivery Policy</a> for
              details. We target a 99.9% network uptime SLA. Scheduled maintenance is
              communicated in advance.
            </p>

            <h2>8. Refunds &amp; Cancellations</h2>
            <p>
              Refunds and cancellations are governed by our{" "}
              <a href="/refund">Refund &amp; Cancellation Policy</a>. By default,
              services may be cancelled at any time and prorated refunds are not provided
              once the service is provisioned, except in cases covered by the policy.
            </p>

            <h2>9. Data Backup</h2>
            <p>
              You are responsible for maintaining your own backups. While we take
              reasonable care, LinuxPro is not liable for loss of data due to hardware
              failure, OS reinstallation, or user error.
            </p>

            <h2>10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by Indian law, LinuxPro&rsquo;s total
              liability for any claim arising from the Service shall not exceed the
              amount paid by you in the three (3) months preceding the claim. We are not
              liable for indirect, incidental, or consequential damages.
            </p>

            <h2>11. Termination</h2>
            <p>
              We may suspend or terminate your account for non-payment, breach of these
              Terms, or any unlawful activity. You may close your account at any time by
              writing to <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>.
            </p>

            <h2>12. Governing Law &amp; Jurisdiction</h2>
            <p>
              These Terms are governed by the laws of India. Any disputes shall be
              subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.
            </p>

            <h2>13. Contact</h2>
            <p>
              For questions about these Terms, contact{" "}
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
