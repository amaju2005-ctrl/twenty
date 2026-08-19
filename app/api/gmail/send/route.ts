import { buildMimeMessage, getValidAccessToken, type GmailConnection } from "@/lib/gmail";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const input = await request.json() as { to?: string; subject?: string; body?: string; personId?: string };
  if (!input.to || !input.subject || !input.body) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "false") return Response.json({ mode: "demo", id: `demo-${Date.now()}`, recorded: true });
    return Response.json({ error: "Recipient, subject and body are required" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "false") return Response.json({ mode: "demo", id: `demo-${Date.now()}`, recorded: true });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = await createServerSupabaseClient();
  const { data: connection } = await supabase!.from("gmail_connections").select("*").eq("user_id", user.id).maybeSingle();
  if (!connection) return Response.json({ error: "Connect Gmail before sending" }, { status: 409 });
  try {
    const valid = await getValidAccessToken(connection as GmailConnection);
    const accessToken = typeof valid === "string" ? valid : valid.token;
    if (typeof valid !== "string") await supabase!.from("gmail_connections").update({ access_token_encrypted: valid.encryptedToken, expires_at: valid.expiresAt }).eq("user_id", user.id);
    const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: buildMimeMessage({ to: input.to, subject: input.subject, body: input.body, from: connection.gmail_address }) }),
      cache: "no-store",
    });
    if (!gmailResponse.ok) throw new Error("Gmail send failed");
    const sent = await gmailResponse.json() as { id: string; threadId: string };
    await supabase!.from("outreach_messages").insert({ user_id: user.id, person_id: input.personId || null, to_email: input.to, subject: input.subject, body: input.body, status: "sent", gmail_message_id: sent.id, gmail_thread_id: sent.threadId, sent_at: new Date().toISOString() });
    return Response.json({ mode: "live", ...sent });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to send" }, { status: 502 });
  }
}
