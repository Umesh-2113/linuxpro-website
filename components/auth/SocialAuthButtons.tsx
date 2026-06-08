"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import type { OAuthProviderId, OAuthProviderMeta } from "@/lib/auth-options";
import { clearNewsSeen } from "@/components/news/NewsPopup";

function ProviderIcon({ id }: { id: OAuthProviderId }) {
  if (id === "google") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M12 10.2v3.6h5.1c-.2 1.2-1.6 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.8 3.7 14.6 2.8 12 2.8 7.2 2.8 3.3 6.7 3.3 11.5S7.2 20.2 12 20.2c6.9 0 8.6-4.9 8.6-7.3 0-.5 0-.9-.1-1.2H12z"
        />
        <path
          fill="#34A853"
          d="M4.8 14.5l2.9 2.1c.8 2.4 2.8 4.1 5.3 4.1 1.6 0 3-.6 4.1-1.6l3.8 3.8c-1.8 1.7-4.2 2.7-7.9 2.7-4.8 0-8.9-3.9-8.9-8.7 0-1.3.3-2.5.8-3.6z"
        />
        <path
          fill="#4A90E2"
          d="M12 6.2c1.9 0 3.2.8 3.9 1.5l2.9-2.9C16.7 3.2 14.5 2.2 12 2.2 9.1 2.2 6.6 3.8 5.2 6.1l3 2.3C9.1 7.2 10.4 6.2 12 6.2z"
        />
        <path
          fill="#FBBC05"
          d="M12 20.2c3.6 0 5.6-1.5 6.9-2.7l-3.3-2.7c-.9.6-2.1 1-3.6 1-2.7 0-5-1.8-5.8-4.3l-3 2.3c1.4 2.8 4.3 4.4 7.8 4.4z"
        />
      </svg>
    );
  }

  if (id === "github") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.2 11.2 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.3.8 1 .8 2.1v3.1c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.65 18.35.5 12 .5z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#f25022" d="M3 3h8v8H3z" />
      <path fill="#7fba00" d="M13 3h8v8h-8z" />
      <path fill="#00a4ef" d="M3 13h8v8H3z" />
      <path fill="#ffb900" d="M13 13h8v8h-8z" />
    </svg>
  );
}

type Props = {
  providers: OAuthProviderMeta[];
};

export function SocialAuthButtons({ providers }: Props) {
  const [loadingId, setLoadingId] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState("");

  const handleOAuth = async (providerId: OAuthProviderId) => {
    setError("");
    setLoadingId(providerId);
    try {
      clearNewsSeen();
      await signIn(providerId, { callbackUrl: "/client" });
    } catch {
      setError("Could not start social sign-in. Please try again.");
      setLoadingId(null);
    }
  };

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="auth-oauth">
      {error && <div className="auth-form__error">{error}</div>}
      <div className="auth-oauth__buttons">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className={`auth-oauth__btn auth-oauth__btn--${provider.id}`}
            onClick={() => handleOAuth(provider.id)}
            disabled={loadingId !== null}
          >
            <span className="auth-oauth__icon">
              <ProviderIcon id={provider.id} />
            </span>
            <span>{loadingId === provider.id ? "Redirecting..." : provider.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="auth-divider" aria-hidden="true">
      <span>or continue with email</span>
    </div>
  );
}
