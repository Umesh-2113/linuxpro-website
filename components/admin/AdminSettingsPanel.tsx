"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";

type HostHeavenStatus = {
  ok: boolean;
  configured?: boolean;
  accountType?: "reseller" | "user";
  userId?: number;
  vmCount?: number;
  sampleIps?: string[];
  message?: string;
};

type HostHeavenSyncResult = {
  ok: boolean;
  message: string;
  pools?: number;
  updated?: number;
  created?: number;
  availableIps?: number;
};

export function AdminSettingsPanel() {
  const [hostHeaven, setHostHeaven] = useState<HostHeavenStatus | null>(null);
  const [hostHeavenLoading, setHostHeavenLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<HostHeavenSyncResult | null>(null);

  const testHostHeaven = useCallback(async () => {
    setHostHeavenLoading(true);
    try {
      const data = await apiGet<HostHeavenStatus>("/api/admin/hostheaven/status");
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

  const syncStock = useCallback(async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const data = await apiPost<HostHeavenSyncResult>("/api/admin/hostheaven/sync", {});
      setSyncResult(data);
    } catch {
      setSyncResult({
        ok: false,
        message: "Stock sync failed.",
      });
    } finally {
      setSyncLoading(false);
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
            HostHeaven can sync live free-IP counts for stock display. Order delivery is
            manual — after payment, admin enters IP, username and password in Orders.
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

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => void testHostHeaven()}
              disabled={hostHeavenLoading}
            >
              {hostHeavenLoading ? "Testing…" : "Test connection again"}
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void syncStock()}
              disabled={syncLoading || !hostHeaven?.ok}
            >
              {syncLoading ? "Syncing…" : "Sync live stock now"}
            </button>
          </div>

          {syncResult ? (
            <p className={`admin-panel__note${syncResult.ok ? "" : " manage-reinstall-error"}`}>
              {syncResult.message}
              {syncResult.ok
                ? ` (updated ${syncResult.updated ?? 0}, created ${syncResult.created ?? 0}, free IPs ${syncResult.availableIps ?? 0})`
                : ""}
            </p>
          ) : null}

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
          <h2>How auto delivery works</h2>
          <ol className="admin-panel__note" style={{ paddingLeft: "1.2rem" }}>
            <li>OceanLinux stock: keep OCEANLINUX_API_KEY/SECRET + wallet balance</li>
            <li>HostHeaven stock: keep HOSTHEAVEN_* vars in VPS .env</li>
            <li>Optional Backup Stock fills gaps when API has no free IP</li>
            <li>Customer pays with Wallet / Cashfree → credentials go to My Servers</li>
          </ol>
        </section>
      </div>
    </>
  );
}
