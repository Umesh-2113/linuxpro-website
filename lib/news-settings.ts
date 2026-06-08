import { apiGet, apiPatch } from "@/lib/api-client";
import { siteContact } from "@/lib/contact";

export type NewsPopupSettings = {
  whatsappNumber: string;
  whatsappJoinLink: string;
  contactPhone: string;
  contactEmail: string;
};

export const defaultNewsPopupSettings: NewsPopupSettings = {
  whatsappNumber: siteContact.phone,
  whatsappJoinLink: "",
  contactPhone: siteContact.phone,
  contactEmail: siteContact.email,
};

export async function fetchNewsPopupSettings(): Promise<NewsPopupSettings> {
  return apiGet<NewsPopupSettings>("/api/news/settings");
}

export async function updateNewsPopupSettings(
  updates: Partial<NewsPopupSettings>
): Promise<NewsPopupSettings> {
  return apiPatch<NewsPopupSettings>("/api/news/settings", updates);
}
