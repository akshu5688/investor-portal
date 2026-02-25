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
      const next = url.searchParams.get("next") || "/dashboard";

      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState({}, document.title, url.pathname + url.search);
      }

      let sessionUserExists = false;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          sessionUserExists = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (!mounted) return;
      router.replace(sessionUserExists ? next : "/dashboard");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session) {
        router.replace(new URL(window.location.href).searchParams.get("next") || "/dashboard");
      }
    });

    completeAuthFlow();
    return () => {
      mounted = false;
      subscription.unsubscribe();
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

