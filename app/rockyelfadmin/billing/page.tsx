import { redirect } from "next/navigation";
import { ADMIN_BASE_PATH } from "@/lib/admin";

export default function AdminBillingRedirectPage() {
  redirect(`${ADMIN_BASE_PATH}/wallet`);
}
