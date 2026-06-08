"use client";

import { useState } from "react";

export function CredentialRow({
  label,
  value,
  secret,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  const [visible, setVisible] = useState(!secret);

  return (
    <div className="server-cred">
      <span className="server-cred__label">{label}</span>
      <div className="server-cred__value">
        <code>{secret && !visible ? "••••••••" : value}</code>
        {secret && (
          <button
            type="button"
            className="server-cred__toggle"
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? "Hide" : "Show"}
          </button>
        )}
      </div>
    </div>
  );
}
