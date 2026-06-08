/** Public site URL — set NEXT_PUBLIC_APP_URL on Vercel (e.g. https://linuxpro.in). */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://linuxpro.in";
  return raw.replace(/\/$/, "");
}

export function getSiteDomain(): string {
  return getSiteUrl().replace(/^https?:\/\//, "");
}

/** Brand name shown in UI (unchanged when only the domain changes). */
export const siteBrandName = "LinuxPro";
