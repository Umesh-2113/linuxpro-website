"use client";

import { useCallback, useEffect, useState } from "react";

type HostHeavenStatus = {
  ok: boolean;
  configured?: boolean;
  accountType?: "reseller" | "user";
  userId?: number;
  vmCount?: number;
  sampleIps?: string[];
  message?: string;
};

export function AdminSettingsPanel() {
  const [hostHeaven, setHostHeaven] = useState<HostHeavenStatus | null>(null);
  const [hostHeavenLoading, setHostHeavenLoading] = useState(false);

  const testHostHeaven = useCallback(async () => {
    setHostHeavenLoading(true);
    try {
      const res = await fetch("/api/admin/hostheaven/status", { cache: "no-store" });
      const data = (await res.json()) as HostHeavenStatus;
      setHostHeaven(data);
    } catch {
      setHostHeaven({
        ok: false,
        message: "Could not reach HostHeaven status API.",
      });
    } finally {
      setHostHeavenLoading(false);
    }
  }, []);

  useEffect(() => {
    void testHostHeaven();
  }, [testHostHeaven]);

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h1>Settings</h1>
          <p>Admin panel configuration and integrations.</p>
        </div>
      </header>

      <div className="admin-settings-grid">
        <section className="admin-panel glass">
          <h2>HostHeaven VPS API</h2>
          <p className="admin-panel__note">
            Used when stock is set to <strong>Manage via → HostHeaven VPS</strong>. Start/stop/reinstall
            runs automatically from Admin → Manage when you click Processing.
          </p>

          {hostHeavenLoading ? (
            <p className="admin-panel__note">Testing API connection…</p>
          ) : hostHeaven ? (
            <ul className="inner-facts">
              <li>
                <span>Status</span>
                <strong className={hostHeaven.ok ? "text-success" : "text-danger"}>
                  {hostHeaven.ok ? "Connected" : "Not connected"}
                </strong>
              </li>
              <li>
                <span>Env configured</span>
                <strong>{hostHeaven.configured ? "Yes" : "No"}</strong>
              </li>
              {hostHeaven.accountType ? (
                <li>
                  <span>Account type</span>
                  <strong>{hostHeaven.accountType}</strong>
                </li>
              ) : null}
              {typeof hostHeaven.vmCount === "number" ? (
                <li>
                  <span>VMs found</span>
                  <strong>{hostHeaven.vmCount}</strong>
                </li>
              ) : null}
              {hostHeaven.sampleIps && hostHeaven.sampleIps.length > 0 ? (
                <li>
                  <span>Sample IPs</span>
                  <strong>{hostHeaven.sampleIps.join(", ")}</strong>
                </li>
              ) : null}
            </ul>
          ) : null}

          {hostHeaven?.message ? (
            <p className={`admin-panel__note${hostHeaven.ok ? "" : " manage-reinstall-error"}`}>
              {hostHeaven.message}
            </p>
          ) : null}

          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => void testHostHeaven()}
            disabled={hostHeavenLoading}
          >
            {hostHeavenLoading ? "Testing…" : "Test connection again"}
          </button>

          <div className="admin-panel__note" style={{ marginTop: "1rem" }}>
            <strong>.env variables:</strong>
            <br />
            HOSTHEAVEN_API_BASE_URL, HOSTHEAVEN_EMAIL, HOSTHEAVEN_PASSWORD
          </div>
        </section>

        <section className="admin-panel glass">
          <h2>Admin Account</h2>
          <ul className="inner-facts">
            <li>
              <span>Email</span>
              <strong>skodia.in@gmail.com</strong>
            </li>
            <li>
              <span>Role</span>
              <strong>Super Admin</strong>
            </li>
            <li>
              <span>Panel Version</span>
              <strong>1.0.0</strong>
            </li>
          </ul>
        </section>

        <section className="admin-panel glass">
          <h2>How to use HostHeaven API</h2>
          <ol className="admin-panel__note" style={{ paddingLeft: "1.2rem" }}>
            <li>Add HOSTHEAVEN_* vars in .env (local) or VPS /var/www/linuxpro-website/.env</li>
            <li>Admin → Stock → Edit IP → Manage via = HostHeaven VPS</li>
            <li>Deliver order with exact IP (e.g. 162.4.147.118)</li>
            <li>Customer requests start/stop → Admin → Manage → Processing</li>
          </ol>
        </section>
      </div>
    </>
  );
}
