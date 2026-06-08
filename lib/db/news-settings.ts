import { getDb } from "@/lib/mongodb";
import {
  defaultNewsPopupSettings,
  type NewsPopupSettings,
} from "@/lib/news-settings";

const SETTINGS_ID = "news_popup";

type SettingsDoc = NewsPopupSettings & { id: string };

function normalizeSettings(doc: Partial<SettingsDoc> | null): NewsPopupSettings {
  return {
    whatsappNumber:
      String(doc?.whatsappNumber ?? defaultNewsPopupSettings.whatsappNumber).trim() ||
      defaultNewsPopupSettings.whatsappNumber,
    whatsappJoinLink: String(doc?.whatsappJoinLink ?? "").trim(),
    contactPhone:
      String(doc?.contactPhone ?? defaultNewsPopupSettings.contactPhone).trim() ||
      defaultNewsPopupSettings.contactPhone,
    contactEmail:
      String(doc?.contactEmail ?? defaultNewsPopupSettings.contactEmail).trim() ||
      defaultNewsPopupSettings.contactEmail,
  };
}

async function collection() {
  const db = await getDb();
  return db.collection<SettingsDoc>("site_settings");
}

export async function dbGetNewsPopupSettings(): Promise<NewsPopupSettings> {
  const doc = await (await collection()).findOne({ id: SETTINGS_ID });
  return normalizeSettings(doc);
}

export async function dbUpdateNewsPopupSettings(
  updates: Partial<NewsPopupSettings>
): Promise<NewsPopupSettings> {
  const col = await collection();
  const existing = await col.findOne({ id: SETTINGS_ID });
  const next = normalizeSettings({ ...existing, ...updates, id: SETTINGS_ID });
  if (existing) {
    await col.updateOne({ id: SETTINGS_ID }, { $set: next });
  } else {
    await col.insertOne({ ...next, id: SETTINGS_ID });
  }
  return next;
}
