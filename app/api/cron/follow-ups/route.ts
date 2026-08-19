import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) return Response.json({ error: "Supabase is not configured" }, { status: 503 });
  const { data, error } = await supabase
    .from("outreach_messages")
    .update({ status: "follow_up_due" })
    .eq("status", "sent")
    .lte("follow_up_at", new Date().toISOString())
    .select("id,user_id");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (data?.length) {
    await supabase.from("outreach_events").insert(data.map((item) => ({ user_id: item.user_id, outreach_message_id: item.id, event_type: "follow_up_due" })));
  }
  return Response.json({ markedDue: data?.length || 0 });
}
