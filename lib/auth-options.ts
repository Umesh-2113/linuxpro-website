import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { dbLoginWithEmail, dbOAuthSignIn } from "@/lib/db/users";
import type { AuthProvider } from "@/lib/users";

export type OAuthProviderId = "google" | "github" | "azure-ad";

export type OAuthProviderMeta = {
  id: OAuthProviderId;
  label: string;
};

const oauthCatalog: OAuthProviderMeta[] = [
  { id: "google", label: "Continue with Google" },
  { id: "github", label: "Continue with GitHub" },
  { id: "azure-ad", label: "Continue with Microsoft" },
];

function mapOAuthProvider(provider: string): AuthProvider | null {
  if (provider === "google" || provider === "github" || provider === "azure-ad") {
    return provider;
  }
  return null;
}

function buildProviders(): NextAuthOptions["providers"] {
  const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const result = await dbLoginWithEmail(
          String(credentials.email),
          String(credentials.password)
        );

        if (!result.user) return null;

        return {
          id: result.user.email,
          email: result.user.email,
          name: result.user.name,
          image: result.user.avatarUrl ?? undefined,
        };
      },
    }),
  ];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: { params: { prompt: "consent" } },
      })
    );
  }

  if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
    providers.push(
      GitHubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
      })
    );
  }

  if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
    providers.push(
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
        tenantId: process.env.AZURE_AD_TENANT_ID || "common",
      })
    );
  }

  return providers;
}

export function getOAuthProviders(): OAuthProviderMeta[] {
  const configured = new Set(
    buildProviders()
      .map((provider) => ("id" in provider ? provider.id : null))
      .filter(Boolean)
  );
  return oauthCatalog.filter((provider) => configured.has(provider.id));
}

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      if (!user.email || !account?.provider) return false;

      const provider = mapOAuthProvider(account.provider);
      if (!provider) return false;

      const result = await dbOAuthSignIn({
        email: user.email,
        name: user.name || user.email.split("@")[0],
        avatarUrl: user.image ?? undefined,
        provider,
      });

      if (!result.ok) {
        return `/login?authError=${result.error ?? "oauth_denied"}`;
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/client`;
    },
    async jwt({ token, account, user }) {
      if (account?.provider) {
        token.provider =
          account.provider === "credentials" ? "email" : account.provider;
      }
      if (user?.email) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.provider = typeof token.provider === "string" ? token.provider : undefined;
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
      }
      return session;
    },
  },
};
