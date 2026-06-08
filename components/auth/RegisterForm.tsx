"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { registerWithEmail } from "@/lib/auth";
import type { OAuthProviderMeta } from "@/lib/auth-options";
import { AuthDivider, SocialAuthButtons } from "@/components/auth/SocialAuthButtons";

type Props = {
  oauthProviders: OAuthProviderMeta[];
};

export function RegisterForm({ oauthProviders }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const result = await registerWithEmail(name, email, password);
    if (!result.user) {
      setError(result.error ?? "Could not create account.");
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (signInResult?.error) {
      setError("Account created. Please sign in with your new credentials.");
      setLoading(false);
      router.push("/login");
      return;
    }

    router.push("/client");
    router.refresh();
  };

  return (
    <>
      <SocialAuthButtons providers={oauthProviders} />
      {oauthProviders.length > 0 && <AuthDivider />}
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-form__error">{error}</div>}
        <div className="auth-form__field">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
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
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <label className="auth-form__checkbox auth-form__checkbox--block">
          <input type="checkbox" required />
          I agree to the <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>
        </label>
        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loading}>
          {loading ? "Creating account..." : "Create Account with Email"}
        </button>
        <p className="auth-form__footer">
          Already have an account?{" "}
          <Link href="/login" className="auth-form__link">
            Sign in
          </Link>
        </p>
      </form>
    </>
  );
}
