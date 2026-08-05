import { dbAddNews } from "@/lib/db/news";
import {
  formatStockPrice,
  getProductSeriesName,
  stockTypeLabels,
  type StockItem,
} from "@/lib/stock";

/** Create a client news popup so registered users see new / restocked inventory. */
export async function notifyClientsNewStock(
  item: StockItem,
  kind: "added" | "restocked" = "added"
): Promise<void> {
  if (!item || item.quantity <= 0) return;

  const name = getProductSeriesName(item.series);
  const typeLabel = stockTypeLabels[item.type] ?? item.type;
  const price = formatStockPrice(item);
  const title =
    kind === "restocked"
      ? `Restocked: ${name}`
      : `New stock live: ${name}`;
  const body =
    kind === "restocked"
      ? `${typeLabel} · ${item.region} is back in stock (${item.quantity} ready) — ${price}. Open Plans to buy.`
      : `Fresh ${typeLabel} stock is available: ${name} · ${item.region} · ${item.quantity} ready — ${price}. Open Plans and grab it before it sells out.`;

  await dbAddNews({
    title,
    body,
    variant: "promo",
    active: true,
  });
}
