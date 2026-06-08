import type { Metadata } from "next";
import { MarketingLayout } from "@/components/layouts/MarketingLayout";
import { PageHero } from "@/components/PageHero";
import { siteContact } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — LinuxPro",
  description:
    "LinuxPro refund and cancellation policy for VPS, Linux server, and proxy services purchased via Cashfree.",
};

const LAST_UPDATED = "8 June 2026";

export default function RefundPage() {
  return (
    <MarketingLayout>
      <PageHero
        tag="Legal"
        title="Refund & Cancellation Policy"
        description="When and how refunds are processed for LinuxPro services."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Refund & Cancellation Policy" },
        ]}
      />
      <section className="inner-page">
        <div className="container legal-page">
          <p className="legal-page__updated">Last updated: {LAST_UPDATED}</p>

          <article className="legal-page__article glass">
            <h2>1. Overview</h2>
            <p>
              LinuxPro Technologies Pvt. Ltd. provides digital hosting services (VPS,
              Linux servers, dedicated servers, proxies). Since these are virtual /
              digital products provisioned to you on-demand, refunds are governed by
              this policy and processed back through Cashfree Payments to your original
              payment method.
            </p>

            <h2>2. Cancellation Before Delivery</h2>
            <p>
              If you wish to cancel an order <strong>before</strong> the service is
              provisioned (typically within a few minutes of payment), email{" "}
              <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>{" "}
              immediately. If we receive your request before provisioning, you will
              receive a <strong>100% refund</strong> within 5–7 business days.
            </p>

            <h2>3. Refund After Delivery</h2>
            <ul>
              <li>
                <strong>VPS / Linux servers:</strong> If the service does not work as
                described (e.g. connectivity failure, undelivered credentials, wrong
                configuration) and we are unable to resolve the issue within 48 hours of
                you raising a support ticket, you are eligible for a{" "}
                <strong>full refund</strong>.
              </li>
              <li>
                <strong>Proxy IPs:</strong> Refundable only if the proxy is completely
                non-functional on delivery and our team cannot resolve it within 24 hours
                of the ticket being raised.
              </li>
              <li>
                <strong>Change of mind:</strong> Once a service has been provisioned and
                used, we generally do not provide refunds for change of mind. However,
                pro-rata credits towards a future order may be granted at our discretion.
              </li>
            </ul>

            <h2>4. Non-Refundable Situations</h2>
            <p>You are <strong>not</strong> eligible for a refund if:</p>
            <ul>
              <li>The service was used for activities violating our <a href="/terms">Terms &amp; Conditions</a> (spam, abuse, illegal use, etc.).</li>
              <li>The account was suspended or terminated for breach of policy.</li>
              <li>You provided incorrect configuration details and the server was provisioned accordingly.</li>
              <li>The refund request is raised more than 7 days after the original payment.</li>
              <li>Add-ons, customisations, or one-time setup fees once delivered.</li>
            </ul>

            <h2>5. Promo Code Refunds</h2>
            <p>
              If you used a promotional code at checkout, only the <em>actual amount
              paid</em> after discount is refundable.
            </p>

            <h2>6. How to Request a Refund</h2>
            <ol>
              <li>
                Email{" "}
                <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a> with the
                subject &ldquo;Refund Request — Order #XXXXXX&rdquo;.
              </li>
              <li>Include your registered email, the order ID, and a brief reason.</li>
              <li>Our team will respond within 2 business days with a status update.</li>
              <li>
                Approved refunds are initiated within 3 business days and credited to the
                original payment method by Cashfree within 5–7 additional business days
                (depending on your bank/card issuer).
              </li>
            </ol>

            <h2>7. Chargebacks</h2>
            <p>
              Please contact us before initiating a chargeback with your bank — we are
              committed to resolving genuine issues quickly. Unjustified chargebacks may
              lead to account termination and recovery action.
            </p>

            <h2>8. Contact</h2>
            <p>
              For refund queries, reach{" "}
              <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a> or call{" "}
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
