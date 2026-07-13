import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div>
      <div className="mb-6 space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Log in to continue your MDCAT preparation.
        </p>
      </div>
      <AuthForm mode="login" />
    </div>
  );
}
