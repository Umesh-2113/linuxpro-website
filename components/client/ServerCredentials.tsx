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
  const [copied, setCopied] = useState(false);
  const display = secret && !visible ? "••••••••" : value || "—";

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="server-cred">
      <span className="server-cred__label">{label}</span>
      <div className="server-cred__value">
        <code title={secret && !visible ? undefined : value}>{display}</code>
        <div className="server-cred__actions">
          {secret ? (
            <button
              type="button"
              className="server-cred__toggle"
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? "Hide" : "Show"}
            </button>
          ) : null}
          <button
            type="button"
            className="server-cred__toggle"
            onClick={() => void copy()}
            disabled={!value}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
