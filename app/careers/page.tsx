import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/layouts/MarketingLayout";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Careers — LinuxPro",
  description: "Join the LinuxPro team. Open positions in engineering, support, and sales.",
};

const jobs = [
  { title: "Senior Linux Systems Engineer", location: "Mumbai / Remote", type: "Full-time" },
  { title: "DevOps Engineer", location: "Remote", type: "Full-time" },
  { title: "Customer Support Specialist", location: "Mumbai", type: "Full-time" },
  { title: "Sales Development Representative", location: "Remote", type: "Full-time" },
];

export default function CareersPage() {
  return (
    <MarketingLayout>
      <PageHero
        tag="Careers"
        title="Join Our Team"
        description="Help us build the future of Linux hosting. We're always looking for talented people."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Careers" }]}
      />
      <section className="inner-page">
        <div className="container">
          <div className="careers-list">
            {jobs.map((job) => (
              <div key={job.title} className="careers-item glass">
                <div>
                  <h3>{job.title}</h3>
                  <span>{job.location} · {job.type}</span>
                </div>
                <Link href="/contact" className="btn btn--outline btn--sm">Apply</Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
