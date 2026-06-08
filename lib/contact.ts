import { getSiteDomain } from "@/lib/site";

export const siteContact = {
  phone: "+917873557074",
  phoneDisplay: "+91 78735 57074",
  email: `helpdesk@${getSiteDomain()}`,
} as const;

export function whatsappChatUrl(number: string): string {
  const digits = number.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}
