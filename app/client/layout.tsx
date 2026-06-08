import type { Metadata } from "next";
import { ClientAuthGuard } from "@/components/client/ClientAuthGuard";

export const metadata: Metadata = {
  title: "Client Area — LinuxPro",
  robots: { index: false },
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientAuthGuard>{children}</ClientAuthGuard>;
}
