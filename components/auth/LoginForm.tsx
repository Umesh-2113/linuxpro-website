"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import type { OAuthProviderMeta } from "@/lib/auth-options";
import { AuthDivider, SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { clearNewsSeen } from "@/components/news/NewsPopup";

type Props = {
  oauthProviders: OAuthProviderMeta[];
};

function mapAuthError(code: string | null): string {
  switch (code) {
    case "email_account_exists":
      return "This email is registered with email and password. Sign in with email instead.";
    case "wrong_oauth_provider":
      return "This email is registered with a different social provider. Use the same button you signed up with.";
    case "oauth_denied":
      return "Social sign-in was denied. Please try again.";
    case "db_error":
      return "Could not save your account. Check MongoDB Atlas allows your server IP (165.99.222.214).";
    case "OAuthCallback":
    case "Callback":
      return "Google sign-in callback failed. Restart the app after updating .env, then try again.";
    case "Configuration":
      return "Auth is misconfigured. Set NEXTAUTH_URL, NEXTAUTH_SECRET, and AUTH_TRUST_HOST=true on the server.";
    case "OAuthSignin":
    case "OAuthCreateAccount":
      return "Could not start Google sign-in. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.";
    case "AccessDenied":
      return "Sign-in was blocked. If the Google app is in Testing mode, add your Gmail as a test user.";
    case "CredentialsSignin":
      return "Invalid email or password. Use the same credentials you registered with.";
    default:
      return code
        ? `Sign-in failed (${code}). Check server logs: pm2 logs linuxpro`
        : "";
  }
}

export function LoginForm({ oauthProviders }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const queryError = useMemo(
    () =>
      mapAuthError(
        searchParams.get("authError") || searchParams.get("error")
      ),
    [searchParams]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(mapAuthError(result.error) || "Invalid email or password.");
      setLoading(false);
      return;
    }

    clearNewsSeen();
    router.push("/client");
    router.refresh();
  };

  return (
    <>
      <SocialAuthButtons providers={oauthProviders} />
      {oauthProviders.length > 0 && <AuthDivider />}
      <form className="auth-form" onSubmit={handleSubmit}>
        {(error || queryError) && (
          <div className="auth-form__error">{error || queryError}</div>
        )}
        <div className="auth-form__field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="you@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="auth-form__field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div className="auth-form__row">
          <label className="auth-form__checkbox">
            <input type="checkbox" defaultChecked />
            Remember me
          </label>
          <Link href="#" className="auth-form__link">
            Forgot password?
          </Link>
        </div>
        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loading}>
          {loading ? "Signing in..." : "Sign In with Email"}
        </button>
        <p className="auth-form__footer">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="auth-form__link">
            Create account
          </Link>
        </p>
      </form>
    </>
  );
}
