/** Extract IP-like prefix from stock series labels like "103.183 (New Launch)". */
export function seriesIpPrefix(series: string): string {
  // Prefer longer prefixes first (3 octets), then 2.
  const three = series.match(/(\d{1,3}\.\d{1,3}\.\d{1,3})(?:\D|$)/);
  if (three?.[1]) return three[1];
  const two = series.match(/(\d{1,3}\.\d{1,3})(?:\D|$)/);
  if (two?.[1]) return two[1];
  const one = series.match(/(\d{1,3})(?:\D|$)/);
  return one?.[1] ?? series.trim();
}

/** Group key for inventory pools — prefer first two octets. */
export function ipSeriesKey(ip: string): string {
  const parts = ip.trim().split(".");
  if (parts.length >= 2 && parts.every((p) => /^\d{1,3}$/.test(p))) {
    return `${parts[0]}.${parts[1]}`;
  }
  return ip.trim();
}

export function ipMatchesSeries(ip: string, series: string): boolean {
  const prefix = seriesIpPrefix(series);
  if (!prefix) return false;
  const normalizedIp = ip.trim().toLowerCase();
  const normalizedPrefix = prefix.trim().toLowerCase();

  if (
    normalizedIp === normalizedPrefix ||
    normalizedIp.startsWith(`${normalizedPrefix}.`)
  ) {
    return true;
  }

  // Also allow stock series "103.183.x" / "103.82.7x" style labels via 2-octet key.
  const ipKey = ipSeriesKey(normalizedIp);
  const seriesKey = ipSeriesKey(
    normalizedPrefix.includes(".") ? `${normalizedPrefix}.0` : normalizedPrefix
  );
  if (ipKey && seriesKey && ipKey === seriesKey) return true;

  // Substring fallback: series text contains "103.183" and IP starts with it.
  const loose = series.match(/\d{1,3}(?:\.\d{1,3}){1,2}/g) ?? [];
  return loose.some(
    (p) =>
      normalizedIp === p.toLowerCase() ||
      normalizedIp.startsWith(`${p.toLowerCase()}.`)
  );
}
