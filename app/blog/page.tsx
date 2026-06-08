import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/layouts/MarketingLayout";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Blog — LinuxPro",
  description: "Linux hosting tips, tutorials, and industry news from the LinuxPro team.",
};

const posts = [
  {
    slug: "nvme-vs-ssd-hosting",
    title: "NVMe vs SSD: Why Storage Speed Matters for Hosting",
    excerpt: "Learn how NVMe drives deliver up to 10x faster I/O for databases and web applications.",
    date: "May 28, 2026",
    tag: "Performance",
  },
  {
    slug: "secure-linux-server",
    title: "10 Steps to Secure Your Linux Server in 2026",
    excerpt: "A practical security checklist every Linux administrator should follow.",
    date: "May 15, 2026",
    tag: "Security",
  },
  {
    slug: "vps-migration-guide",
    title: "Complete Guide to Migrating Your VPS to LinuxPro",
    excerpt: "Zero-downtime migration strategies for moving your apps to LinuxPro infrastructure.",
    date: "Apr 30, 2026",
    tag: "Tutorial",
  },
];

export default function BlogPage() {
  return (
    <MarketingLayout>
      <PageHero
        tag="Blog"
        title="LinuxPro Blog"
        description="Hosting tips, tutorials, and insights from our engineering team."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Blog" }]}
      />
      <section className="inner-page">
        <div className="container blog-grid">
          {posts.map((post) => (
            <article key={post.slug} className="blog-card glass">
              <span className="section-tag">{post.tag}</span>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <div className="blog-card__footer">
                <span>{post.date}</span>
                <Link href="#" className="auth-form__link">Read more →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
