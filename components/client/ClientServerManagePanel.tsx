"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { CredentialRow } from "@/components/client/ServerCredentials";
import { getServerById, fetchServers, type UserServer } from "@/lib/user-servers";
import { stockTypeLabels } from "@/lib/stock";
import {
  actionStatusLabels,
  createServerAction,
  getActionsByServer,
  reinstallOsLabels,
  serverActionDescriptions,
  serverActionLabels,
  type ReinstallOsOption,
  type ServerActionRequest,
  type ServerActionType,
} from "@/lib/server-actions";

type Props = {
  serverId: string;
};

function powerLabel(state: UserServer["powerState"]) {
  if (state === "running") return "Online";
  if (state === "stopped") return "Offline";
  return "Unknown";
}

function StartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

function ReinstallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <path d="M1 4v6h6M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
    </svg>
  );
}

const actionIcons: Record<ServerActionType, React.ReactNode> = {
  start: <StartIcon />,
  stop: <StopIcon />,
  reinstall: <ReinstallIcon />,
};

export function ClientServerManagePanel({ serverId }: Props) {
  const router = useRouter();
  const [server, setServer] = useState<UserServer | null>(null);
  const [actions, setActions] = useState<ServerActionRequest[]>([]);
  const [showReinstallModal, setShowReinstallModal] = useState(false);
  const [selectedOs, setSelectedOs] = useState<ReinstallOsOption>("ubuntu");
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    const user = getUser();
    const s = getServerById(serverId);
    if (!user || !s || s.userEmail !== user.email) {
      setServer(null);
      return;
    }
    setServer(s);
    setActions(getActionsByServer(serverId));
  }, [serverId]);

  useEffect(() => {
    load();
    window.addEventListener("servers-updated", load);
    window.addEventListener("server-actions-updated", load);
    return () => {
      window.removeEventListener("servers-updated", load);
      window.removeEventListener("server-actions-updated", load);
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!showReinstallModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showReinstallModal]);

  const pendingFor = (action: ServerActionType) =>
    actions.find((a) => a.action === action && (a.status === "pending" || a.status === "processing"));

  const isSuspended = server?.status === "suspended";

  const submitAction = (action: ServerActionType, reinstallOs?: ReinstallOsOption) => {
    void (async () => {
      if (!server) return;
      const user = getUser();
      if (!user) return;

      try {
        const result = await createServerAction({
          serverId: server.id,
          serverName: server.name,
          serverIp: server.ip,
          orderId: server.orderId,
          userEmail: user.email,
          userName: user.name,
          action,
          reinstallOs,
        });
        setShowReinstallModal(false);
        const label =
          action === "reinstall" && reinstallOs
            ? `Reinstall (${reinstallOsLabels[reinstallOs]})`
            : serverActionLabels[action];

        const viaApi = result.status === "completed";
        if (viaApi) {
          setToast(
            action === "reinstall"
              ? `${label} started via HostHeaven — new password saved here and syncing to HostHeaven (may take 1–2 min while rebuild finishes).`
              : `${label} completed via HostHeaven API.`
          );
          await fetchServers(user.email);
          window.dispatchEvent(new Event("servers-updated"));
        } else {
          setToast(`${label} request sent — our team will process it shortly.`);
        }
        load();
      } catch (err) {
        setShowReinstallModal(false);
        setToast(err instanceof Error ? err.message : "Action failed. Try again.");
      }
    })();
  };

  const handleAction = (action: ServerActionType) => {
    if (!server) return;
    if (pendingFor(action)) {
      setToast("This action is already in progress.");
      return;
    }
    if (action === "reinstall") {
      setSelectedOs("ubuntu");
      setShowReinstallModal(true);
      return;
    }
    submitAction(action);
  };

  const handleReinstallConfirm = () => {
    submitAction("reinstall", selectedOs);
  };

  if (!server) {
    return (
      <div className="stock-empty glass stock-empty--cool">
        <h3>Server not found</h3>
        <p>This server does not exist or you don&apos;t have access.</p>
        <Link href="/client/servers" className="btn btn--primary">
          Back to Servers
        </Link>
      </div>
    );
  }

  const pendingStart = pendingFor("start");
  const pendingStop = pendingFor("stop");
  const pendingReinstall = pendingFor("reinstall");
  const osDisplay = server.os && server.os !== "N/A" ? server.os : "—";

  const actionItems: {
    action: ServerActionType;
    pending: ServerActionRequest | undefined;
    pendingLabel?: string;
  }[] = [
    { action: "start", pending: pendingStart },
    { action: "stop", pending: pendingStop },
    {
      action: "reinstall",
      pending: pendingReinstall,
      pendingLabel: pendingReinstall?.reinstallOs
        ? reinstallOsLabels[pendingReinstall.reinstallOs]
        : undefined,
    },
  ];

  return (
    <div className="manage-pro">
      {toast && (
        <div className="manage-pro-toast">
          <span className="manage-pro-toast__icon">✓</span>
          {toast}
        </div>
      )}

      {showReinstallModal && (
        <div
          className="manage-modal-overlay manage-modal-overlay--solid"
          onClick={() => setShowReinstallModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reinstall-modal-title"
        >
          <div className="manage-pro-modal manage-pro-modal--solid" onClick={(e) => e.stopPropagation()}>
            <div className="manage-pro-modal__header">
              <span className="manage-pro-modal__icon">
                <ReinstallIcon />
              </span>
              <div>
                <h3 id="reinstall-modal-title">Reinstall Operating System</h3>
                <p>All data will be erased. Choose your new OS.</p>
              </div>
            </div>

            <div className="os-picker">
              {(["ubuntu", "windows"] as ReinstallOsOption[]).map((os) => (
                <button
                  key={os}
                  type="button"
                  className={`os-picker__option${selectedOs === os ? " os-picker__option--active" : ""}`}
                  onClick={() => setSelectedOs(os)}
                >
                  <span className={`os-picker__icon os-picker__icon--${os}`}>
                    {os === "ubuntu" ? "U" : "W"}
                  </span>
                  <span className="os-picker__name">{reinstallOsLabels[os]}</span>
                  <span className="os-picker__hint">
                    {os === "ubuntu" ? "Linux · LTS" : "Windows Server"}
                  </span>
                </button>
              ))}
            </div>

            <p className="manage-modal-warning">
              {server.provider === "hostheaven"
                ? "HostHeaven API will rebuild the OS now. New username and password will appear in credentials below."
                : "If this server is on HostHeaven, rebuild runs via API immediately. Otherwise admin will deliver new credentials."}
            </p>

            <div className="manage-modal-actions">
              <button type="button" className="btn btn--outline" onClick={() => setShowReinstallModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn--danger" onClick={handleReinstallConfirm}>
                {server.provider === "hostheaven" ? "Reinstall via API" : "Confirm Reinstall"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="manage-pro-hero">
        <div className="manage-pro-hero__glow" aria-hidden />
        <button
          type="button"
          className="manage-pro-back"
          onClick={() => router.push("/client/servers")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          All Servers
        </button>

        <div className="manage-pro-hero__body">
          <div className="manage-pro-hero__main">
            <div className="manage-pro-hero__tags">
              <span className="manage-pro-tag">{stockTypeLabels[server.type]}</span>
              <span className="manage-pro-tag manage-pro-tag--muted">{server.region}</span>
              <span className="manage-pro-tag manage-pro-tag--muted">#{server.orderId}</span>
            </div>
            <h1 className="manage-pro-hero__title">{server.name}</h1>
            <div className="manage-pro-hero__ip">{server.ip}</div>
            <div className="manage-pro-hero__chips">
              <span className="manage-pro-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                {osDisplay}
              </span>
              <span className="manage-pro-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                {server.plan}
              </span>
            </div>
          </div>

          <div className={`manage-pro-power manage-pro-power--${server.powerState}`}>
            <div className="manage-pro-power__ring">
              <div className="manage-pro-power__core">
                {actionIcons[server.powerState === "running" ? "start" : "stop"]}
              </div>
            </div>
            <span className="manage-pro-power__label">{powerLabel(server.powerState)}</span>
            <span className={`manage-pro-power__account manage-pro-power__account--${server.status}`}>
              {server.status}
            </span>
          </div>
        </div>
      </section>

      <section className="manage-pro-actions glass">
        <div className="manage-pro-actions__head">
          <h2>Server Controls</h2>
          <p>Requests are processed by our admin team</p>
        </div>

        <div className="manage-pro-actions__grid">
          {actionItems.map(({ action, pending, pendingLabel }) => (
            <button
              key={action}
              type="button"
              className={`manage-pro-action manage-pro-action--${action}${
                pending ? " manage-pro-action--pending" : ""
              }`}
              onClick={() => handleAction(action)}
              disabled={!!pending || isSuspended}
            >
              <span className="manage-pro-action__icon">{actionIcons[action]}</span>
              <span className="manage-pro-action__text">
                <strong>{serverActionLabels[action]}</strong>
                <small>{serverActionDescriptions[action]}</small>
              </span>
              {pending && (
                <span className="manage-pro-action__status">
                  {pendingLabel ?? actionStatusLabels[pending.status]}
                </span>
              )}
            </button>
          ))}
        </div>

        {isSuspended && (
          <div className="manage-pro-alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
            Server suspended — contact support to restore access.
          </div>
        )}
      </section>

      <div className="manage-pro-grid">
        <section className="manage-pro-creds glass">
          <div className="manage-pro-creds__bar">
            <span className="manage-pro-creds__dot manage-pro-creds__dot--red" />
            <span className="manage-pro-creds__dot manage-pro-creds__dot--yellow" />
            <span className="manage-pro-creds__dot manage-pro-creds__dot--green" />
            <span className="manage-pro-creds__title">ssh credentials</span>
          </div>
          <div className="manage-pro-creds__body">
            <p className="manage-pro-creds__hint">
              Use these details to connect. Updated automatically after OS reinstall.
            </p>
            <div className="server-creds server-creds--large">
              <CredentialRow label="IP Address" value={server.ip} />
              {server.type === "proxy" && server.port && (
                <CredentialRow label="Port" value={server.port} />
              )}
              <CredentialRow label="Username" value={server.username} />
              <CredentialRow label="Password" value={server.password} secret />
            </div>
          </div>
        </section>

        <aside className="manage-pro-specs glass">
          <h2>Overview</h2>
          <ul className="manage-pro-specs__list">
            <li>
              <span className="manage-pro-specs__icon">🌐</span>
              <div>
                <small>Region</small>
                <strong>{server.region}</strong>
              </div>
            </li>
            <li>
              <span className="manage-pro-specs__icon">💿</span>
              <div>
                <small>Operating System</small>
                <strong>{osDisplay}</strong>
              </div>
            </li>
            <li>
              <span className="manage-pro-specs__icon">📦</span>
              <div>
                <small>Plan</small>
                <strong>{server.plan}</strong>
              </div>
            </li>
            <li>
              <span className="manage-pro-specs__icon">⚡</span>
              <div>
                <small>Power State</small>
                <strong className={`text-power text-power--${server.powerState}`}>
                  {powerLabel(server.powerState)}
                </strong>
              </div>
            </li>
          </ul>
          <Link href="/client/support" className="manage-pro-support">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            Need help? Contact Support
          </Link>
        </aside>
      </div>
    </div>
  );
}
