import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { gmailRedirectUri } from "@/lib/gmail";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/settings?tab=integrations&gmail=not-configured", origin));
  }
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("gmail_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  const oauth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  oauth.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: gmailRedirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
    ].join(" "),
    state,
  }).toString();
  return NextResponse.redirect(oauth);
}
