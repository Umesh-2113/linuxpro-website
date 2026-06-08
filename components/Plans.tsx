import Link from "next/link";
import { AnimateOnScroll } from "./AnimateOnScroll";
import { CheckIcon } from "./icons";
import { dbGetTopSellingStock } from "@/lib/db/stock";
import {
  formatRamPlansSummary,
  formatStockSpecs,
  getRamPlans,
  getStockStatus,
  getStockStatusLabel,
  stockTypeLabels,
  type StockItem,
} from "@/lib/stock";

const HOME_PLAN_LIMIT = 4;

function planFeatures(item: StockItem): string[] {
  const features: string[] = [`IP Series ${item.series}`, formatStockSpecs(item)];
  if (item.type !== "proxy" && getRamPlans(item).length > 0) {
    features.push(formatRamPlansSummary(item));
  }
  if (item.region) features.push(item.region);
  if (item.os && item.os !== "N/A") features.push(item.os);
  if (item.type === "proxy" && item.port) features.push(`Port ${item.port}`);
  features.push(
    item.quantity > 0 ? `${item.quantity} IP${item.quantity === 1 ? "" : "s"} available` : "Out of stock"
  );
  return features;
}

function pickPopularIndex(items: StockItem[]): number {
  const inStock = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.quantity > 0);
  if (inStock.length === 0) return -1;
  const best = inStock.reduce((a, b) => (b.item.quantity > a.item.quantity ? b : a));
  return best.index;
}

export async function Plans() {
  const stock = await dbGetTopSellingStock(HOME_PLAN_LIMIT);
  const popularIndex = pickPopularIndex(stock);

  return (
    <section className="plans" id="plans">
      <div className="container">
        <AnimateOnScroll className="section-header">
          <span className="section-tag">Live IP Stock</span>
          <h2 className="section-title">Choose Your Perfect Plan</h2>
          <p className="section-desc">
            Top {HOME_PLAN_LIMIT} best-selling IP plans from our inventory — VPS, Linux servers, and proxy IPs ready to deploy.
          </p>
        </AnimateOnScroll>

        {stock.length === 0 ? (
          <AnimateOnScroll>
            <div className="plans__empty glass">
              <p>No IP stock listed yet. Check back soon or contact us for availability.</p>
              <Link href="/contact" className="btn btn--primary">
                Contact Us
              </Link>
            </div>
          </AnimateOnScroll>
        ) : (
          <div className="plans__grid plans__grid--featured">
            {stock.map((item, i) => {
              const popular = i === popularIndex;
              const status = getStockStatus(item.quantity);
              const outOfStock = status === "out-of-stock";

              return (
                <AnimateOnScroll key={item.id} delay={i * 100} asChild>
                  <article
                    className={`plan-card glass${popular ? " plan-card--popular" : ""}${outOfStock ? " plan-card--sold-out" : ""}`}
                  >
                    {popular && <div className="plan-card__badge">Most Popular</div>}
                    <div className="plan-card__header">
                      <span className="plan-card__type">{stockTypeLabels[item.type]}</span>
                      <h3 className="plan-card__name">IP {item.series}</h3>
                      <p className="plan-card__desc">
                        {stockTypeLabels[item.type]} · {item.region}
                      </p>
                    </div>
                    <div className="plan-card__price">
                      {getRamPlans(item).length > 1 ? (
                        <span className="plan-card__amount plan-card__amount--from">
                          {formatRamPlansSummary(item)}
                        </span>
                      ) : (
                        <>
                          <span className="plan-card__currency">₹</span>
                          <span className="plan-card__amount">
                            {item.price.toLocaleString("en-IN")}
                          </span>
                          <span className="plan-card__period">/month</span>
                        </>
                      )}
                    </div>
                    <p className={`plan-card__status plan-card__status--${status}`}>
                      {getStockStatusLabel(status)}
                    </p>
                    <ul className="plan-card__features">
                      {planFeatures(item).map((f) => (
                        <li key={f}>
                          <CheckIcon />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {outOfStock ? (
                      <span className="btn btn--outline btn--block plan-card__btn-disabled">
                        Out of Stock
                      </span>
                    ) : (
                      <Link
                        href="/client/ip-stock"
                        className={`btn btn--${popular ? "primary" : "outline"} btn--block`}
                      >
                        Get Started
                      </Link>
                    )}
                  </article>
                </AnimateOnScroll>
              );
            })}
          </div>
        )}
        {stock.length > 0 && (
          <AnimateOnScroll delay={400}>
            <p className="plans__view-all">
              <Link href="/client/ip-stock" className="btn btn--outline">
                View all IP stock →
              </Link>
            </p>
          </AnimateOnScroll>
        )}
      </div>
    </section>
  );
}
