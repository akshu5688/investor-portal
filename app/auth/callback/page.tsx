"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const completeAuthFlow = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const rawNext = url.searchParams.get("next") || "/dashboard";
      const next =
        rawNext.startsWith("/") && !rawNext.startsWith("//")
          ? rawNext
          : "/dashboard";

      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      const errorCode =
        url.searchParams.get("error_code") ??
        hashParams.get("error_code") ??
        url.searchParams.get("error") ??
        hashParams.get("error");
      const hasGrant = Boolean(code) || Boolean(accessToken && refreshToken);
      if (!hasGrant && errorCode) {
        if (!mounted) return;
        const params = new URLSearchParams();
        params.set("reason", errorCode === "otp_expired" ? "expired" : errorCode);
        if (next !== "/dashboard") params.set("next", next);
        router.replace(`/auth/confirm?${params.toString()}`);
        return;
      }

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState({}, document.title, url.pathname + url.search);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      if (session) {
        router.refresh();
        router.replace(next);
      } else {
        router.replace("/login");
      }
    };

    completeAuthFlow();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Verifying your account...
      </p>
    </div>
  );
}

