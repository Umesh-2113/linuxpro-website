import type { Metadata } from "next";
import { HostingPage } from "@/components/HostingPage";

export const metadata: Metadata = {
  title: "VPS Hosting — LinuxPro",
  description: "High-performance Linux VPS hosting with NVMe SSD, full root access, and instant deployment.",
};

export default function VpsPage() {
  return (
    <HostingPage
      tag="VPS Hosting"
      title="Linux VPS Hosting"
      description="Scalable virtual private servers with dedicated resources and full root control."
      highlights={[
        "Full root SSH access",
        "NVMe SSD storage",
        "Instant 60-second deployment",
        "DDoS protection included",
        "One-click OS reinstall",
        "99.99% uptime SLA",
      ]}
      body={[
        "Our VPS hosting gives you guaranteed CPU, RAM, and storage on enterprise hardware powered by AMD EPYC processors. Deploy Ubuntu, Debian, CentOS, or Rocky Linux with a single click.",
        "Whether you're running a web app, API, database, or development environment, LinuxPro VPS delivers the performance and control you need at prices starting from just ₹299/month.",
      ]}
    />
  );
}
