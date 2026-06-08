import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LiveChat } from "@/components/LiveChat";
import { PageAmbient } from "@/components/ui/PageAmbient";

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <PageAmbient />
      <Header />
      <main className="site-main">{children}</main>
      <Footer />
      <LiveChat />
    </div>
  );
}
