"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PageAmbient } from "@/components/ui/PageAmbient";
import { ADMIN_BASE_PATH, adminLogin } from "@/lib/admin";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (await adminLogin(email, password)) {
      router.push(ADMIN_BASE_PATH);
    } else {
      setError("Invalid admin credentials.");
    }
  };

  return (
    <div className="admin-login-page site-shell">
      <PageAmbient variant="auth" />
      <form className="auth-form glass admin-login-card" onSubmit={handleSubmit}>
        <Logo />
        <h1 className="admin-login-card__title">Admin Panel</h1>
        <p className="auth-page__subtitle">
          Sign in to manage stock, tickets, users, and more.
        </p>
        {error && <div className="auth-form__error">{error}</div>}
        <div className="auth-form__field">
          <label htmlFor="admin-email">Admin email</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="skodia.in@gmail.com"
            required
          />
        </div>
        <div className="auth-form__field">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn--primary btn--block btn--lg">
          Sign In to Admin
        </button>
      </form>
    </div>
  );
}
