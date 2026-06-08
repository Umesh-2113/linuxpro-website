"use client";

import { useCallback, useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [theme, setTheme] = useState<Theme>("dark");

  const syncTheme = useCallback(() => setTheme(getStoredTheme()), []);

  useEffect(() => {
    const user = getUser();
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
    syncTheme();
    window.addEventListener("theme-updated", syncTheme);
    return () => window.removeEventListener("theme-updated", syncTheme);
  }, [syncTheme]);

  const handleTheme = (next: Theme) => {
    applyTheme(next);
    setTheme(next);
    window.dispatchEvent(new Event("theme-updated"));
  };

  return (
    <>
      <header className="client-topbar">
        <div>
          <h1>Settings</h1>
          <p>Manage your account and security preferences.</p>
        </div>
      </header>

      <div className="client-settings">
        <section className="client-panel glass">
          <h2>Profile</h2>
          <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
            <div className="auth-form__field">
              <label htmlFor="settings-name">Full name</label>
              <input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="auth-form__field">
              <label htmlFor="settings-email">Email</label>
              <input id="settings-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn--primary btn--sm">Save Changes</button>
          </form>
        </section>

        <section className="client-panel glass">
          <h2>Security</h2>
          <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
            <div className="auth-form__field">
              <label htmlFor="current-pw">Current password</label>
              <input id="current-pw" type="password" placeholder="••••••••" />
            </div>
            <div className="auth-form__field">
              <label htmlFor="new-pw">New password</label>
              <input id="new-pw" type="password" placeholder="Min. 6 characters" />
            </div>
            <button type="submit" className="btn btn--outline btn--sm">Update Password</button>
          </form>
        </section>

        <section className="client-panel glass">
          <h2>Appearance</h2>
          <p className="client-panel__desc">Choose light or dark theme for the client area and website.</p>
          <div className="theme-picker">
            <button
              type="button"
              className={`theme-picker__option${theme === "dark" ? " theme-picker__option--active" : ""}`}
              onClick={() => handleTheme("dark")}
            >
              <span className="theme-picker__preview theme-picker__preview--dark" />
              Dark
            </button>
            <button
              type="button"
              className={`theme-picker__option${theme === "light" ? " theme-picker__option--active" : ""}`}
              onClick={() => handleTheme("light")}
            >
              <span className="theme-picker__preview theme-picker__preview--light" />
              Light
            </button>
          </div>
        </section>

        <section className="client-panel glass">
          <h2>Two-Factor Authentication</h2>
          <p className="client-panel__desc">
            Add an extra layer of security to your account with 2FA.
          </p>
          <button type="button" className="btn btn--outline btn--sm">Enable 2FA</button>
        </section>
      </div>
    </>
  );
}
