import { MarketingLayout } from "@/components/layouts/MarketingLayout";

/** Live IP stock from MongoDB — render at request time, not at build. */
export const dynamic = "force-dynamic";
import { Hero } from "@/components/Hero";
import { Plans } from "@/components/Plans";
import { Features } from "@/components/Features";
import { WhyUs } from "@/components/WhyUs";
import { Stats } from "@/components/Stats";
import { Compare } from "@/components/Compare";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";

export default function Home() {
  return (
    <MarketingLayout>
      <Hero />
      <Plans />
      <Features />
      <WhyUs />
      <Stats />
      <Compare />
      <Testimonials />
      <FAQ />
      <CTA />
    </MarketingLayout>
  );
}
