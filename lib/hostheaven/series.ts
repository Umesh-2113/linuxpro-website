/** Extract IP-like prefix from stock series labels like "103.183 (New Launch)". */
export function seriesIpPrefix(series: string): string {
  const match = series.match(/(\d{1,3}(?:\.\d{1,3}){1,2})/);
  return match?.[1] ?? series.trim();
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
  return (
    normalizedIp === normalizedPrefix ||
    normalizedIp.startsWith(`${normalizedPrefix}.`)
  );
}
