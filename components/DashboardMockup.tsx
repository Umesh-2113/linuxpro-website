export function DashboardMockup() {
  const chartHeights = [40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 95];
  const servers = [
    { name: "vps-prod-01", ip: "192.168.1.10" },
    { name: "vps-prod-02", ip: "192.168.1.11" },
    { name: "cloud-db-01", ip: "10.0.0.5" },
  ];

  return (
    <div className="dashboard-mockup">
      <div className="dashboard-mockup__header">
        <div className="dashboard-mockup__dots">
          <span />
          <span />
          <span />
        </div>
        <span className="dashboard-mockup__title">LinuxPro Control Panel</span>
        <div className="dashboard-mockup__status">
          <span className="status-dot" />
          All Systems Operational
        </div>
      </div>
      <div className="dashboard-mockup__body">
        <div className="dashboard-mockup__sidebar">
          <div className="sidebar-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <div className="sidebar-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </div>
          <div className="sidebar-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 10h-4V4M6 14h4v6" />
              <path d="M14 4h4v6M10 20H6v-6" />
            </svg>
          </div>
          <div className="sidebar-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </div>
        </div>
        <div className="dashboard-mockup__main">
          <div className="dashboard-stats">
            <div className="dash-stat">
              <span className="dash-stat__label">CPU Usage</span>
              <span className="dash-stat__value">24%</span>
              <div className="dash-stat__bar">
                <div className="dash-stat__fill" style={{ width: "24%" }} />
              </div>
            </div>
            <div className="dash-stat">
              <span className="dash-stat__label">RAM Usage</span>
              <span className="dash-stat__value">3.2 GB</span>
              <div className="dash-stat__bar">
                <div className="dash-stat__fill" style={{ width: "40%" }} />
              </div>
            </div>
            <div className="dash-stat">
              <span className="dash-stat__label">Network</span>
              <span className="dash-stat__value">1.2 Gbps</span>
              <div className="dash-stat__bar">
                <div className="dash-stat__fill dash-stat__fill--pulse" style={{ width: "65%" }} />
              </div>
            </div>
          </div>
          <div className="dashboard-chart">
            <div className="chart-bars">
              {chartHeights.map((h, i) => (
                <div
                  key={i}
                  className={`chart-bar${i === chartHeights.length - 1 ? " active" : ""}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <span className="chart-label">Server Traffic — Last 12 Hours</span>
          </div>
          <div className="dashboard-servers">
            {servers.map((s) => (
              <div key={s.name} className="server-row">
                <span className="server-dot online" />
                <span>{s.name}</span>
                <span className="server-ip">{s.ip}</span>
                <span className="server-status">Running</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
