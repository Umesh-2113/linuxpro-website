import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/layouts/MarketingLayout";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "About Us — LinuxPro",
  description: "Learn about LinuxPro — premium Linux hosting built for modern businesses.",
};

export default function AboutPage() {
  return (
    <MarketingLayout>
      <PageHero
        tag="About"
        title="Powering the Open Web"
        description="LinuxPro was founded with one mission: make enterprise-grade Linux hosting accessible to everyone."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      />
      <section className="inner-page">
        <div className="container inner-page__grid">
          <div className="inner-content">
            <h2>Who We Are</h2>
            <p>
              LinuxPro is a premium web hosting provider specializing in VPS, cloud, and dedicated
              Linux servers. Since 2018, we&apos;ve helped over 10,000 businesses deploy and scale
              their infrastructure with 99.99% uptime.
            </p>
            <p>
              Our team of Linux engineers operates data centers in Mumbai, Singapore, Frankfurt,
              and New York — delivering low-latency performance worldwide.
            </p>
            <h2>Our Mission</h2>
            <p>
              To provide fast, secure, and affordable hosting without compromising on quality.
              Every server runs on NVMe SSD storage with DDoS protection and 24/7 expert support
              included at no extra cost.
            </p>
            <Link href="/contact" className="btn btn--primary">
              Get in Touch
            </Link>
          </div>
          <div className="inner-aside glass">
            <h3>Quick Facts</h3>
            <ul className="inner-facts">
              <li><strong>Founded</strong> 2018</li>
              <li><strong>Customers</strong> 10,000+</li>
              <li><strong>Servers</strong> 50,000+ deployed</li>
              <li><strong>Uptime SLA</strong> 99.99%</li>
              <li><strong>Data Centers</strong> 4 global regions</li>
            </ul>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
