import type { Metadata } from "next";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getOAuthProviders } from "@/lib/auth-options";

export const metadata: Metadata = {
  title: "Create Account — LinuxPro",
  description: "Create your LinuxPro account and deploy your first server in minutes.",
};

export default function RegisterPage() {
  const oauthProviders = getOAuthProviders();

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        oauthProviders.length > 0
          ? "Sign up with Google, GitHub, Microsoft, or your email in under a minute."
          : "Create your account with email and password."
      }
    >
      <RegisterForm oauthProviders={oauthProviders} />
    </AuthLayout>
  );
}
