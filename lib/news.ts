import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";

export type NewsVariant = "info" | "update" | "promo" | "warning";

export type NewsItem = {
  id: string;
  title: string;
  body: string;
  variant: NewsVariant;
  active: boolean;
  createdAt: string;
};

export const newsVariantLabels: Record<NewsVariant, string> = {
  info: "Info",
  update: "Update",
  promo: "Promo",
  warning: "Important",
};

export type NewsInput = {
  title: string;
  body: string;
  variant: NewsVariant;
  active: boolean;
};

export async function fetchActiveNews(): Promise<NewsItem[]> {
  return apiGet<NewsItem[]>("/api/news?active=true");
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  return apiGet<NewsItem[]>("/api/news");
}

export async function addNews(input: NewsInput): Promise<NewsItem> {
  return apiPost<NewsItem>("/api/news", input);
}

export async function updateNews(
  id: string,
  updates: Partial<NewsInput>
): Promise<NewsItem> {
  return apiPatch<NewsItem>(`/api/news/${id}`, updates);
}

export async function deleteNews(id: string): Promise<void> {
  await apiDelete(`/api/news/${id}`);
}
