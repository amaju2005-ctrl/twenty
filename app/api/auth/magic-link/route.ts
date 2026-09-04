import { createServerSupabaseClient } from "@/lib/supabase/server";

function demoEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
}

export async function POST(request: Request) {
  const { email, next } = await request.json().catch(() => ({})) as { email?: string; next?: string };
  const normalizedEmail = email?.trim().toLowerCase() || "";
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    if (demoEnabled()) return Response.json({ mode: "demo" });
    return Response.json({ error: "Supabase authentication is not configured." }, { status: 503 });
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin = configuredOrigin || new URL(request.url).origin;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(destination)}` },
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ sent: true });
}
