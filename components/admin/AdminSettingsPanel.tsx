"use client";

export function AdminSettingsPanel() {
  return (
    <>
      <header className="admin-topbar">
        <div>
          <h1>Settings</h1>
          <p>Admin panel configuration and account info.</p>
        </div>
      </header>

      <div className="admin-settings-grid">
        <section className="admin-panel glass">
          <h2>Admin Account</h2>
          <ul className="inner-facts">
            <li><span>Email</span><strong>skodia.in@gmail.com</strong></li>
            <li><span>Role</span><strong>Super Admin</strong></li>
            <li><span>Panel Version</span><strong>1.0.0</strong></li>
          </ul>
        </section>

        <section className="admin-panel glass">
          <h2>System Info</h2>
          <ul className="inner-facts">
            <li><span>Storage</span><strong>localStorage (demo)</strong></li>
            <li><span>Auth</span><strong>Session-based</strong></li>
            <li><span>Environment</span><strong>Development</strong></li>
          </ul>
          <p className="admin-panel__note">
            Connect a real database and API for production use.
          </p>
        </section>
      </div>
    </>
  );
}
