import { MarketingLayout } from "@/components/layouts/MarketingLayout";

/** Live IP stock from MongoDB — render at request time, not at build. */
export const dynamic = "force-dynamic";
import { Hero } from "@/components/Hero";
import { HomeTrustStrip } from "@/components/home/HomeTrustStrip";
import { Plans } from "@/components/Plans";
import { HomeSeries } from "@/components/home/HomeSeries";
import { HomeWhy } from "@/components/home/HomeWhy";
import { HomePerformance } from "@/components/home/HomePerformance";
import { HomeSecurity } from "@/components/home/HomeSecurity";
import { Stats } from "@/components/Stats";
import { HomeHowItWorks } from "@/components/home/HomeHowItWorks";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { HomeWhatsAppFloat } from "@/components/home/HomeWhatsAppFloat";

export default function Home() {
  return (
    <MarketingLayout>
      <Hero />
      <HomeTrustStrip />
      <Plans />
      <HomeSeries />
      <HomeWhy />
      <HomePerformance />
      <HomeSecurity />
      <Stats />
      <HomeHowItWorks />
      <FAQ />
      <CTA />
      <HomeWhatsAppFloat />
    </MarketingLayout>
  );
}
