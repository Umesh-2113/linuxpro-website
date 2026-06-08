import type { Metadata } from "next";
import { HostingPage } from "@/components/HostingPage";

export const metadata: Metadata = {
  title: "Cloud Hosting — LinuxPro",
  description: "Flexible cloud server hosting with auto-scaling, load balancing, and global data centers.",
};

export default function CloudPage() {
  return (
    <HostingPage
      tag="Cloud Hosting"
      title="Cloud Server Hosting"
      description="Elastic cloud infrastructure that scales with your business demands."
      highlights={[
        "Auto-scaling resources",
        "Load balancer ready",
        "Snapshot backups",
        "Multi-region deployment",
        "Private networking",
        "API-driven management",
      ]}
      body={[
        "LinuxPro Cloud combines the flexibility of cloud computing with the simplicity of our control panel. Scale CPU and RAM on demand, create snapshots, and deploy across multiple regions.",
        "Built for startups and enterprises alike, our cloud platform handles traffic spikes effortlessly while maintaining consistent performance and security.",
      ]}
    />
  );
}
