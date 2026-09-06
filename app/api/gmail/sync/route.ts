import { getValidAccessToken, type GmailConnection } from "@/lib/gmail";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "false") return Response.json({ mode: "demo", synced: 0 });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = await createServerSupabaseClient();
  const { data: connection, error: connectionError } = await supabase!.from("gmail_connections").select("*").eq("user_id", user.id).maybeSingle();
  if (connectionError) return Response.json({ error: "Unable to load the Gmail connection" }, { status: 500 });
  if (!connection) return Response.json({ error: "Gmail is not connected" }, { status: 409 });
  try {
    const valid = await getValidAccessToken(connection as GmailConnection);
    const accessToken = typeof valid === "string" ? valid : valid.token;
    if (typeof valid !== "string") {
      const { error } = await supabase!.from("gmail_connections").update({ access_token_encrypted: valid.encryptedToken, expires_at: valid.expiresAt }).eq("user_id", user.id);
      if (error) return Response.json({ error: "Unable to save the refreshed Gmail token" }, { status: 500 });
    }

    const { data: openMessages, error: messagesError } = await supabase!.from("outreach_messages").select("id,gmail_thread_id").eq("user_id", user.id).in("status", ["sent", "follow_up_due"]);
    if (messagesError) return Response.json({ error: "Unable to load outreach messages" }, { status: 500 });
    let synced = 0;
    for (const message of openMessages || []) {
      if (!message.gmail_thread_id) continue;
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${message.gmail_thread_id}?format=metadata&metadataHeaders=From&metadataHeaders=Date`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      if (!response.ok) continue;
      const thread = await response.json() as { messages?: Array<{ id: string; labelIds?: string[] }> };
      const hasReply = (thread.messages?.length || 0) > 1 && thread.messages?.some((item) => !item.labelIds?.includes("SENT"));
      if (hasReply) {
        const { error: updateError } = await supabase!.from("outreach_messages").update({ status: "replied", replied_at: new Date().toISOString() }).eq("id", message.id).eq("user_id", user.id);
        if (updateError) continue;
        await supabase!.from("outreach_events").insert({ user_id: user.id, outreach_message_id: message.id, event_type: "reply_detected", metadata: { gmail_thread_id: message.gmail_thread_id } });
        synced += 1;
      }
    }
    await supabase!.from("gmail_connections").update({ last_synced_at: new Date().toISOString() }).eq("user_id", user.id);
    return Response.json({ mode: "live", synced });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to sync Gmail" }, { status: 502 });
  }
}
