"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const DEMO_COOKIE = "mp_user";

export type AuthState = { error?: string; message?: string } | undefined;

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
  } else {
    // No backend configured — set a lightweight demo cookie so the app behaves
    // as "logged in" and the dashboard is reachable.
    const store = await cookies();
    store.set(DEMO_COOKIE, email, { path: "/", maxAge: 60 * 60 * 24 * 7 });
  }

  redirect("/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Please fill in your name, email and password." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
    // Email confirmation enabled — no session until they click the link.
    if (!data.session) {
      return {
        message:
          "Account created. Check your email for a confirmation link, then log in. (Also check spam.)",
      };
    }
  } else {
    const store = await cookies();
    store.set(DEMO_COOKIE, email, { path: "/", maxAge: 60 * 60 * 24 * 7 });
  }

  redirect("/dashboard");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  const store = await cookies();
  store.delete(DEMO_COOKIE);
  redirect("/");
}
