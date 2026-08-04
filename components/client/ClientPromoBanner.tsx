"use client";

import { oceanPromoBanner } from "@/lib/client-ocean-data";

export function ClientPromoBanner() {
  return (
    <div className="ocean-promo" role="note">
      <span className="ocean-promo__icon" aria-hidden>
        🎉
      </span>
      <p>
        <strong>{oceanPromoBanner.headline}</strong>
        <span className="ocean-promo__sep">·</span>
        Use code <code>{oceanPromoBanner.code}</code> at checkout on eligible plans.
      </p>
    </div>
  );
}
