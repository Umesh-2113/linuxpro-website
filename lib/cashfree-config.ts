export function isCashfreeProduction(): boolean {
  return (
    process.env.CASHFREE_ENV === "production" ||
    process.env.NEXT_PUBLIC_CASHFREE_MODE === "production"
  );
}

export function isCashfreeSandbox(): boolean {
  return !isCashfreeProduction();
}
