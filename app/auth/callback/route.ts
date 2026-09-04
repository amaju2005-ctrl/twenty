import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const supabase = await createServerSupabaseClient();
  let destination = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login?error=callback", url.origin));
    if (destination === "/dashboard") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle();
        if (!profile?.onboarding_completed) destination = "/onboarding";
      }
    }
  }
  return NextResponse.redirect(new URL(destination, url.origin));
}
