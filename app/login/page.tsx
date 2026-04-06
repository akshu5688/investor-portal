"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getEmailConfirmationRedirectTo,
  getPasswordResetRedirectTo,
} from "@/lib/authRedirect";
import { supabase } from "@/lib/supabaseClient";

function getSupabaseSetupWarning(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !anonKey) {
    return "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.";
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") {
      return "Supabase URL must start with https://. Update NEXT_PUBLIC_SUPABASE_URL in .env.local and restart the dev server.";
    }
  } catch {
    return "Supabase URL is invalid. Update NEXT_PUBLIC_SUPABASE_URL in .env.local and restart the dev server.";
  }

  // Supabase anon keys are JWTs and should have 3 dot-separated sections.
  if (anonKey.split(".").length !== 3) {
    return "Supabase anon key format looks invalid. Update NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the dev server.";
  }

  return null;
}

function normalizeAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network request failed")
  ) {
    return "Cannot reach the login server. Check your internet connection and Supabase URL/key configuration.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }

  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const setupWarning = getSupabaseSetupWarning();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (setupWarning) {
      setError(setupWarning);
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(normalizeAuthErrorMessage(signInError.message));
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      const fallbackMessage = err instanceof Error ? err.message : "Login failed.";
      setError(normalizeAuthErrorMessage(fallbackMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);

    if (setupWarning) {
      setError(setupWarning);
      return;
    }

    const addr = email.trim().toLowerCase();
    if (!addr) {
      setError("Enter your email above, then click “Send reset link”.");
      return;
    }

    setResetSending(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        addr,
        { redirectTo: getPasswordResetRedirectTo() }
      );

      if (resetError) {
        setError(normalizeAuthErrorMessage(resetError.message));
        return;
      }

      setInfo(
        "If an account exists for that email, we sent a link to set a new password. Check your inbox and spam folder."
      );
      setShowForgotPassword(false);
    } catch (err) {
      const fallbackMessage =
        err instanceof Error ? err.message : "Could not send reset email.";
      setError(normalizeAuthErrorMessage(fallbackMessage));
    } finally {
      setResetSending(false);
    }
  };

  const handleResendConfirmation = async () => {
    setError(null);
    setInfo(null);

    if (setupWarning) {
      setError(setupWarning);
      return;
    }

    if (!email) {
      setError("Please enter your email above first.");
      return;
    }

    setResending(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: getEmailConfirmationRedirectTo(),
        },
      });

      if (resendError) {
        setError(normalizeAuthErrorMessage(resendError.message));
        return;
      }

      setInfo("Confirmation email sent. Please check your inbox.");
    } catch (err) {
      const fallbackMessage = err instanceof Error ? err.message : "Failed to resend confirmation email.";
      setError(normalizeAuthErrorMessage(fallbackMessage));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-950">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Log in
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back. Enter your credentials to access your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
            />
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword((v) => !v);
                  setError(null);
                  setInfo(null);
                }}
                className="text-xs font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Forgot password?
              </button>
            </div>
            {showForgotPassword && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-400">
                  We&apos;ll email you a link to set a new password. Use the same email
                  as your account.
                </p>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetSending || Boolean(setupWarning)}
                  className="w-full rounded-lg bg-zinc-200 px-3 py-2 text-xs font-medium text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  {resetSending ? "Sending…" : "Send reset link"}
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {setupWarning && (
            <p className="text-sm text-amber-600 dark:text-amber-400">{setupWarning}</p>
          )}
          {info && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || Boolean(setupWarning)}
            className="flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resending || Boolean(setupWarning)}
            className="mt-2 w-full text-center text-xs font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {resending ? "Sending confirmation email..." : "Resend confirmation email"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

