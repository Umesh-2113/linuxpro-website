import type { Metadata } from "next";

import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";



export const metadata: Metadata = {

  title: "Admin Panel — LinuxPro",

  robots: { index: false },

};



export default function AdminLayout({ children }: { children: React.ReactNode }) {

  return <AdminAuthGuard>{children}</AdminAuthGuard>;

}
