import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import "./ui-premium.css";
import "./home-redesign.css";
import "./client-ocean.css";
import "./ao-orders.css";
import "./cm-manage.css";
import "./invoice.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LinuxPro — Powerful Linux Hosting for Modern Businesses",
  description:
    "High-performance VPS, Cloud, and Dedicated Linux hosting with 99.99% uptime. NVMe SSD, DDoS protection, and 24/7 support.",
  keywords: [
    "Linux hosting",
    "VPS hosting",
    "cloud servers",
    "dedicated servers",
    "NVMe SSD",
    "web hosting India",
  ],
  authors: [{ name: "LinuxPro" }],
  openGraph: {
    title: "LinuxPro — Powerful Linux Hosting for Modern Businesses",
    description:
      "High-performance VPS, Cloud, and Dedicated Servers with 99.99% uptime.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('linuxpro-theme')||'dark';document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
