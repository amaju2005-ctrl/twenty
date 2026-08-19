import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto";
import { gmailRedirectUri } from "@/lib/gmail";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gmail_oauth_state")?.value;
  cookieStore.delete("gmail_oauth_state");
  if (!code || !state || state !== expectedState) return NextResponse.redirect(new URL("/settings?tab=integrations&gmail=invalid-state", url.origin));
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/settings", url.origin));

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: gmailRedirectUri(),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!tokenResponse.ok) return NextResponse.redirect(new URL("/settings?tab=integrations&gmail=token-error", url.origin));
  const tokens = await tokenResponse.json() as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
  const profileResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
  const profile = profileResponse.ok ? await profileResponse.json() as { emailAddress?: string; historyId?: string } : {};
  const supabase = await createServerSupabaseClient();
  await supabase!.from("gmail_connections").upsert({
    user_id: user.id,
    gmail_address: profile.emailAddress || user.email,
    access_token_encrypted: await encryptSecret(tokens.access_token),
    refresh_token_encrypted: tokens.refresh_token ? await encryptSecret(tokens.refresh_token) : null,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    scope: tokens.scope,
    history_id: profile.historyId,
    connected_at: new Date().toISOString(),
  });
  return NextResponse.redirect(new URL("/settings?tab=integrations&gmail=connected", url.origin));
}
