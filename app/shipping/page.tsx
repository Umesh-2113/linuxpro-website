import type { Metadata } from "next";
import { MarketingLayout } from "@/components/layouts/MarketingLayout";
import { PageHero } from "@/components/PageHero";
import { siteContact } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Service Delivery Policy — LinuxPro",
  description:
    "How LinuxPro delivers VPS, Linux server, and proxy services after payment confirmation through Cashfree.",
};

const LAST_UPDATED = "8 June 2026";

export default function ShippingPage() {
  return (
    <MarketingLayout>
      <PageHero
        tag="Legal"
        title="Service Delivery Policy"
        description="How and when our digital services reach you."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Service Delivery Policy" },
        ]}
      />
      <section className="inner-page">
        <div className="container legal-page">
          <p className="legal-page__updated">Last updated: {LAST_UPDATED}</p>

          <article className="legal-page__article glass">
            <h2>1. Nature of Our Services</h2>
            <p>
              LinuxPro provides <strong>digital, intangible services</strong> — virtual
              private servers, Linux servers, dedicated servers, and proxy IPs. There is
              no physical shipping. &ldquo;Delivery&rdquo; means provisioning the server
              and providing you the login credentials (IP, username, password) through
              your client dashboard and registered email.
            </p>

            <h2>2. Delivery Timeline</h2>
            <ul>
              <li>
                <strong>VPS &amp; Linux servers:</strong> typically delivered within{" "}
                <strong>5 to 30 minutes</strong> of successful payment confirmation by
                Cashfree.
              </li>
              <li>
                <strong>Proxy IPs:</strong> typically delivered within{" "}
                <strong>5 to 15 minutes</strong> of payment confirmation.
              </li>
              <li>
                <strong>Custom configurations or dedicated servers:</strong> may take up
                to <strong>24 business hours</strong>. You will be notified by email
                with an ETA after the order is placed.
              </li>
            </ul>
            <p>
              Orders placed during scheduled maintenance windows may take slightly
              longer; we will inform you in advance through our status banner.
            </p>

            <h2>3. How You Receive Your Service</h2>
            <ol>
              <li>You place an order and pay via Cashfree (UPI, cards, net-banking, or wallets).</li>
              <li>On payment success, your order moves to &ldquo;Processing&rdquo;.</li>
              <li>
                Our team provisions the server and updates your order with the IP,
                username, and password. You can view them at any time on the{" "}
                <a href="/client">Client Dashboard</a>.
              </li>
              <li>A delivery confirmation email is sent to your registered email address.</li>
            </ol>

            <h2>4. Delivery Failures</h2>
            <p>
              If you do <strong>not</strong> receive your service within the timeline
              above:
            </p>
            <ul>
              <li>Check your spam folder for the delivery email.</li>
              <li>Log in to the <a href="/client">Client Dashboard</a> — credentials may already be visible.</li>
              <li>
                Raise a ticket from the <a href="/client/support">Support</a> area, or
                email <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>{" "}
                with your order ID.
              </li>
            </ul>
            <p>
              If we are unable to deliver the service within 48 hours of a confirmed
              payment, you are eligible for a full refund under our{" "}
              <a href="/refund">Refund &amp; Cancellation Policy</a>.
            </p>

            <h2>5. Geographic Availability</h2>
            <p>
              Our services are available globally. Indian customers are billed in INR
              and pay through Cashfree. Regional availability of specific datacenter
              locations (Mumbai, Bangalore, Delhi, etc.) is shown on the product page.
            </p>

            <h2>6. Renewal Delivery</h2>
            <p>
              Monthly renewals are processed automatically on the billing date. If the
              renewal payment succeeds, the service remains active uninterrupted. If it
              fails, you will receive grace-period reminders before suspension.
            </p>

            <h2>7. Contact</h2>
            <p>
              For delivery questions, contact{" "}
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
