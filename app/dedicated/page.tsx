import type { Metadata } from "next";
import { HostingPage } from "@/components/HostingPage";

export const metadata: Metadata = {
  title: "Dedicated Servers — LinuxPro",
  description: "Bare-metal dedicated servers with maximum performance, security, and customization.",
};

export default function DedicatedPage() {
  return (
    <HostingPage
      tag="Dedicated Servers"
      title="Dedicated Server Hosting"
      description="Bare-metal power for mission-critical workloads and high-traffic applications."
      highlights={[
        "Dedicated bare-metal hardware",
        "Custom hardware configs",
        "IPMI remote management",
        "Hardware RAID options",
        "10Gbps network ports",
        "Priority support included",
      ]}
      body={[
        "When you need maximum performance and complete hardware isolation, LinuxPro dedicated servers deliver. No noisy neighbors, no resource sharing — just raw power for databases, game servers, and enterprise applications.",
        "Choose from pre-configured setups or work with our team to build a custom server tailored to your exact specifications.",
      ]}
    />
  );
}
