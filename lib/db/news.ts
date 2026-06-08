import { getCollection } from "@/lib/mongodb";
import type { NewsInput, NewsItem, NewsVariant } from "@/lib/news";

const VALID_VARIANTS: NewsVariant[] = ["info", "update", "promo", "warning"];

function normalizeVariant(value: unknown): NewsVariant {
  return VALID_VARIANTS.includes(value as NewsVariant)
    ? (value as NewsVariant)
    : "info";
}

function normalizeItem(item: NewsItem): NewsItem {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    variant: normalizeVariant(item.variant),
    active: item.active !== false,
    createdAt: item.createdAt,
  };
}

async function collection() {
  return getCollection<NewsItem>("news");
}

export async function dbGetNews(): Promise<NewsItem[]> {
  const items = await (await collection()).find({}).sort({ createdAt: -1 }).toArray();
  return items.map(normalizeItem);
}

export async function dbGetActiveNews(): Promise<NewsItem[]> {
  const items = await dbGetNews();
  return items.filter((item) => item.active);
}

export async function dbAddNews(input: NewsInput): Promise<NewsItem> {
  const newItem: NewsItem = {
    id: `news-${Date.now()}`,
    title: input.title,
    body: input.body,
    variant: normalizeVariant(input.variant),
    active: input.active !== false,
    createdAt: new Date().toISOString(),
  };
  await (await collection()).insertOne(newItem);
  return normalizeItem(newItem);
}

export async function dbUpdateNews(
  id: string,
  updates: Partial<NewsInput>
): Promise<NewsItem | null> {
  const col = await collection();
  const existing = await col.findOne({ id });
  if (!existing) return null;
  const next = normalizeItem({ ...existing, ...updates } as NewsItem);
  await col.updateOne({ id }, { $set: next });
  return next;
}

export async function dbDeleteNews(id: string): Promise<boolean> {
  const result = await (await collection()).deleteOne({ id });
  return result.deletedCount > 0;
}
