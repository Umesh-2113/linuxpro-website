"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { apiPost } from "@/lib/api-client";
import { CredentialRow } from "@/components/client/ServerCredentials";
import {
  formatServerExpiry,
  getServerById,
  fetchServers,
  isServerExpired,
  resolveServerExpiresAt,
  type UserServer,
} from "@/lib/user-servers";
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
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

function ReinstallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" aria-hidden>
      <path d="M1 4v6h6M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden>
      <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
      <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" />
      <path d="M16 3h5v5" />
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
  const [busyAction, setBusyAction] = useState<ServerActionType | null>(null);
  const [reinstallPhase, setReinstallPhase] = useState(0);
  const [syncBusy, setSyncBusy] = useState(false);

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
      if (!server || busyAction) return;
      const user = getUser();
      if (!user) return;

      setBusyAction(action);
      if (action === "reinstall") setReinstallPhase(1);

      try {
        if (action === "reinstall") {
          window.setTimeout(() => setReinstallPhase((p) => (p < 2 ? 2 : p)), 2500);
          window.setTimeout(() => setReinstallPhase((p) => (p < 3 ? 3 : p)), 8000);
        }

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

        if (action === "reinstall") {
          setReinstallPhase(4);
          await new Promise((r) => setTimeout(r, 700));
        }

        setShowReinstallModal(false);
        setReinstallPhase(0);
        const label =
          action === "reinstall" && reinstallOs
            ? `Reinstall (${reinstallOsLabels[reinstallOs]})`
            : serverActionLabels[action];

        const viaApi = result.status === "completed";
        if (viaApi) {
          setToast(
            action === "reinstall"
              ? `${label} started — new password saved here (may take 1–2 min).`
              : `${label} completed successfully.`
          );
          await fetchServers(user.email);
          window.dispatchEvent(new Event("servers-updated"));
        } else {
          setToast(`${label} request sent — our team will process it shortly.`);
        }
        load();
      } catch (err) {
        setShowReinstallModal(false);
        setReinstallPhase(0);
        setToast(err instanceof Error ? err.message : "Action failed. Try again.");
      } finally {
        setBusyAction(null);
      }
    })();
  };

  const handleSync = () => {
    void (async () => {
      if (!server || syncBusy || busyAction) return;
      const user = getUser();
      if (!user) return;
      setSyncBusy(true);
      try {
        const result = await apiPost<{ server: UserServer; message: string }>(
          `/api/servers/${server.id}/sync`,
          {}
        );
        await fetchServers(user.email);
        window.dispatchEvent(new Event("servers-updated"));
        load();
        setToast(result.message || "Synced — credentials updated.");
      } catch (err) {
        const raw = err instanceof Error ? err.message : "Sync failed.";
        setToast(raw.replace(/HostHeaven/gi, "provider"));
      } finally {
        setSyncBusy(false);
      }
    })();
  };

  const handleAction = (action: ServerActionType) => {
    if (!server || busyAction) return;
    if (isServerExpired(resolveServerExpiresAt(server))) {
      setToast("This server has expired. Renew to use controls.");
      return;
    }
    if (pendingFor(action)) {
      setToast("This action is already in progress.");
      return;
    }
    if (action === "reinstall") {
      setSelectedOs("ubuntu");
      setReinstallPhase(0);
      setShowReinstallModal(true);
      return;
    }
    submitAction(action);
  };

  const handleReinstallConfirm = () => {
    if (busyAction) return;
    submitAction("reinstall", selectedOs);
  };

  const closeReinstallModal = () => {
    if (busyAction === "reinstall") return;
    setShowReinstallModal(false);
    setReinstallPhase(0);
  };

  const reinstallSteps = [
    "Connecting to server API…",
    "Starting OS rebuild…",
    "Applying new password…",
    "Almost done — updating credentials…",
  ];
  const reinstallStepLabel =
    reinstallPhase >= 1 && reinstallPhase <= 4
      ? reinstallSteps[Math.min(reinstallPhase, 4) - 1]
      : "";

  if (!server) {
    return (
      <div className="cs-empty">
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
  const expiresAt = resolveServerExpiresAt(server);
  const expired = isServerExpired(expiresAt);
  const displayPower: UserServer["powerState"] = expired ? "stopped" : server.powerState;
  const displayPowerLabel = expired ? "Offline" : powerLabel(server.powerState);
  const displayAccountStatus = expired ? "expired" : server.status;

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
    <div className="cm-page">
      {toast ? (
        <div className="cm-toast" role="status">
          {toast}
        </div>
      ) : null}

      {showReinstallModal ? (
        <div
          className="manage-modal-overlay manage-modal-overlay--solid"
          onClick={closeReinstallModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reinstall-modal-title"
          aria-busy={busyAction === "reinstall"}
        >
          <div className="manage-pro-modal manage-pro-modal--solid" onClick={(e) => e.stopPropagation()}>
            {busyAction === "reinstall" ? (
              <div className="manage-reinstall-processing">
                <div className="manage-reinstall-processing__spinner" aria-hidden />
                <h3 id="reinstall-modal-title">Reinstalling {reinstallOsLabels[selectedOs]}</h3>
                <p className="manage-reinstall-processing__phase">{reinstallStepLabel}</p>
                <ul className="manage-reinstall-processing__steps">
                  {reinstallSteps.map((step, i) => {
                    const stepNum = i + 1;
                    const done = reinstallPhase > stepNum;
                    const active = reinstallPhase === stepNum;
                    return (
                      <li key={step} className={done ? "is-done" : active ? "is-active" : ""}>
                        <span className="manage-reinstall-processing__dot" />
                        {step}
                      </li>
                    );
                  })}
                </ul>
                <p className="manage-reinstall-processing__hint">
                  Please wait — do not close this window.
                </p>
              </div>
            ) : (
              <>
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
                    ? "OS will rebuild now via API. New username and password will appear below."
                    : "If API control is available, rebuild runs now. Otherwise admin delivers new credentials."}
                </p>

                <div className="manage-modal-actions">
                  <button type="button" className="btn btn--outline" onClick={closeReinstallModal}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn--danger" onClick={handleReinstallConfirm}>
                    Confirm Reinstall
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <div className="cm-top">
        <button type="button" className="cm-back" onClick={() => router.push("/client/servers")}>
          ← All Servers
        </button>
        <div className="cm-top__right">
          <span className={`cm-pill cm-pill--${displayPower}`}>
            {displayPowerLabel} · {displayAccountStatus}
          </span>
          <button
            type="button"
            className={`cm-sync${syncBusy ? " is-busy" : ""}`}
            onClick={handleSync}
            disabled={syncBusy || !!busyAction || expired}
            title="Pull latest IP, username and password from HostHeaven"
          >
            <SyncIcon />
            {syncBusy ? "Syncing…" : "Sync"}
          </button>
        </div>
      </div>

      <header className="cm-board">
        <div className="cm-board__main">
          <p className="cm-head__tags">
            {stockTypeLabels[server.type]} · {server.region} · #{server.orderId}
          </p>
          <h1>{server.name}</h1>
          <p className="cm-head__ip">{server.ip || "No IP yet — tap Sync"}</p>
          <dl className="cm-facts">
            <div>
              <dt>OS</dt>
              <dd>{osDisplay}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{server.plan}</dd>
            </div>
            <div>
              <dt>{expired ? "Expired" : "Expires"}</dt>
              <dd>{formatServerExpiry(expiresAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="cm-board__side">
          <div className="cm-term">
            <div className="cm-term__bar">
              <span />
              <span />
              <span />
              <strong>credentials</strong>
            </div>
            <div className="server-creds server-creds--term">
              <CredentialRow label="IP" value={server.ip} />
              {server.type === "proxy" && server.port ? (
                <CredentialRow label="Port" value={server.port} />
              ) : null}
              <CredentialRow label="User" value={server.username} />
              <CredentialRow label="Pass" value={server.password} secret />
            </div>
          </div>
        </div>
      </header>

      <section className="cm-panel cm-panel--actions">
        <div className="cm-panel__head">
          <h2>Controls</h2>
          <span>
            {expired
              ? "Locked — plan expired"
              : "Start / Stop / Reinstall · Sync pulls live password"}
          </span>
        </div>

        <div className="cm-actions">
          <button
            type="button"
            className={`cm-btn cm-btn--sync${syncBusy ? " is-busy" : ""}`}
            onClick={handleSync}
            disabled={syncBusy || !!busyAction || expired}
          >
            <span className={`cm-btn__icon${syncBusy ? " is-spinning" : ""}`}>
              <SyncIcon />
            </span>
            <span className="cm-btn__label">
              <strong>Sync</strong>
              <small>{syncBusy ? "Fetching from API…" : "Refresh IP & password"}</small>
            </span>
          </button>

          {actionItems.map(({ action, pending, pendingLabel }) => {
            const isBusy = busyAction === action;
            return (
              <button
                key={action}
                type="button"
                className={`cm-btn cm-btn--${action}${pending || isBusy ? " is-busy" : ""}`}
                onClick={() => handleAction(action)}
                disabled={!!pending || isSuspended || expired || !!busyAction || syncBusy}
              >
                <span className={`cm-btn__icon${isBusy ? " is-spinning" : ""}`}>
                  {actionIcons[action]}
                </span>
                <span className="cm-btn__label">
                  <strong>{serverActionLabels[action]}</strong>
                  <small>
                    {isBusy
                      ? "Processing…"
                      : pending
                        ? pendingLabel ?? actionStatusLabels[pending.status]
                        : serverActionDescriptions[action]}
                  </small>
                </span>
              </button>
            );
          })}
        </div>

        {(expired || isSuspended) && (
          <div className="cm-alert">
            {expired
              ? "Plan expired — renew to restore start / stop / reinstall."
              : "Server suspended — contact support to restore access."}
          </div>
        )}
      </section>

      <p className="cm-help">
        Need help? <Link href="/client/support">Contact Support</Link>
      </p>
    </div>
  );
}
