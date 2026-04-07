"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getEmailConfirmationRedirectTo } from "@/lib/authRedirect";
import { getSafeNextPath } from "@/lib/safe-next-path";
import { supabase } from "@/lib/supabaseClient";

function normalizeOtpError(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("expired") ||
    normalized.includes("invalid") ||
    normalized.includes("otp")
  ) {
    return "That code is invalid or expired. Request a new confirmation email below. If your inbox already opened the link once, try logging in — your email may already be confirmed.";
  }
  return message;
}

function ConfirmEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const emailFromQuery = searchParams.get("email");

  const [email, setEmail] = useState(emailFromQuery ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const reasonHint = useMemo(() => {
    if (reason === "expired" || reason === "otp_expired") {
      return "The confirmation link can expire or be used automatically by some email apps. Use the 6-digit code from the same email instead.";
    }
    if (reason === "access_denied" || reason === "server_error") {
      return "We couldn’t finish signing you in from the link. Use the code from your email, or request a new confirmation email.";
    }
    if (reason) {
      return "If the link from your email didn’t work, enter the 6-digit confirmation code below.";
    }
    return null;
  }, [reason]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const addr = email.trim().toLowerCase();
    const token = code.replace(/\D/g, "");

    if (!addr || token.length < 6) {
      setError("Enter your email and the 6-digit code from the confirmation email.");
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: addr,
        token,
        type: "signup",
      });

      if (verifyError) {
        setError(normalizeOtpError(verifyError.message));
        return;
      }

      const next = getSafeNextPath(searchParams.get("next"));
      router.refresh();
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);

    const addr = email.trim().toLowerCase();
    if (!addr) {
      setError("Enter your email above first.");
      return;
    }

    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: addr,
        options: {
          emailRedirectTo: getEmailConfirmationRedirectTo(),
        },
      });

      if (resendError) {
        setError(normalizeOtpError(resendError.message));
        return;
      }

      setInfo("We sent a new confirmation email. Use the new 6-digit code or link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-950">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Confirm your email
        </h1>
        <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
          Enter the 6-digit code from your signup email. This avoids broken links when your email app
          opens the confirmation link before you do.
        </p>
        {reasonHint && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            {reasonHint}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="confirm-email"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="confirm-email"
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
              htmlFor="confirm-code"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              6-digit code
            </label>
            <input
              id="confirm-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={8}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tracking-widest text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {info && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Verifying…" : "Confirm and continue"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="mt-1 w-full text-center text-xs font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {resending ? "Sending…" : "Resend confirmation email"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/login"
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}

function ConfirmFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-50" />
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Loading…</p>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<ConfirmFallback />}>
      <ConfirmEmailForm />
    </Suspense>
  );
}
