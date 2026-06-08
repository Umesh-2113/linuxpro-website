import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { getOAuthProviders } from "@/lib/auth-options";

export const metadata: Metadata = {
  title: "Login — LinuxPro",
  description: "Sign in to your LinuxPro client area to manage servers, domains, and billing.",
};

export default function LoginPage() {
  const oauthProviders = getOAuthProviders();

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        oauthProviders.length > 0
          ? "Sign in with Google, GitHub, Microsoft, or email."
          : "Sign in with your registered email and password."
      }
    >
      <Suspense fallback={<div className="auth-form">Loading sign-in...</div>}>
        <LoginForm oauthProviders={oauthProviders} />
      </Suspense>
    </AuthLayout>
  );
}
