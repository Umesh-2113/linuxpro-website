const CART_KEY = "linuxpro_cart";

function emitCartUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cart-updated"));
  }
}

export function getCartIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function getCartCount(): number {
  return getCartIds().length;
}

export function addToCart(stockId: string): void {
  const ids = getCartIds();
  if (ids.includes(stockId)) return;
  localStorage.setItem(CART_KEY, JSON.stringify([...ids, stockId]));
  emitCartUpdate();
}

export function removeFromCart(stockId: string): void {
  const ids = getCartIds().filter((id) => id !== stockId);
  localStorage.setItem(CART_KEY, JSON.stringify(ids));
  emitCartUpdate();
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  emitCartUpdate();
}

export function isInCart(stockId: string): boolean {
  return getCartIds().includes(stockId);
}
