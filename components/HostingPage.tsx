import Link from "next/link";
import { PageHero } from "./PageHero";
import { MarketingLayout } from "./layouts/MarketingLayout";
import { plans } from "@/lib/data";
import { CheckIcon } from "./icons";

type HostingPageProps = {
  tag: string;
  title: string;
  description: string;
  highlights: string[];
  body: string[];
};

export function HostingPage({ tag, title, description, highlights, body }: HostingPageProps) {
  return (
    <MarketingLayout>
      <PageHero
        tag={tag}
        title={title}
        description={description}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: title }]}
      />
      <section className="inner-page">
        <div className="container">
          <div className="hosting-highlights">
            {highlights.map((h) => (
              <div key={h} className="hosting-highlight glass">
                <CheckIcon />
                <span>{h}</span>
              </div>
            ))}
          </div>
          <div className="inner-content inner-content--center">
            {body.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
            <Link href="/#plans" className="btn btn--primary btn--lg">
              View Plans
            </Link>
          </div>
          <h2 className="section-title" style={{ textAlign: "center", marginTop: "60px" }}>
            Recommended Plans
          </h2>
          <div className="plans__grid" style={{ marginTop: "32px" }}>
            {plans.map((plan) => (
              <article key={plan.name} className={`plan-card glass${plan.popular ? " plan-card--popular" : ""}`}>
                {plan.popular && <div className="plan-card__badge">Most Popular</div>}
                <div className="plan-card__header">
                  <h3 className="plan-card__name">{plan.name}</h3>
                  <p className="plan-card__desc">{plan.desc}</p>
                </div>
                <div className="plan-card__price">
                  <span className="plan-card__currency">₹</span>
                  <span className="plan-card__amount">{plan.price}</span>
                  <span className="plan-card__period">/month</span>
                </div>
                <Link href="/register" className={`btn btn--${plan.popular ? "primary" : "outline"} btn--block`}>
                  Get Started
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
