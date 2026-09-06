import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

const outreachStatuses = new Set(["draft", "scheduled", "sent", "follow_up_due", "replied", "archived"]);

function demoModeEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    if (demoModeEnabled()) return Response.json({ mode: "demo", messages: [] });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase!.from("outreach_messages").select("*, people(*)").eq("user_id", user.id).order("updated_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ mode: "live", messages: data });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null) as { id?: string; status?: string; follow_up_at?: string | null } | null;
  if (!body?.id) return Response.json({ error: "Message ID is required." }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) {
    if (demoModeEnabled()) return Response.json({ mode: "demo", saved: true });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updates: { status?: string; follow_up_at?: string | null } = {};
  if (body.status !== undefined) {
    if (!outreachStatuses.has(body.status)) return Response.json({ error: "Invalid outreach status." }, { status: 400 });
    updates.status = body.status;
  }
  if (body.follow_up_at !== undefined) {
    if (body.follow_up_at !== null && Number.isNaN(Date.parse(body.follow_up_at))) {
      return Response.json({ error: "Invalid follow-up date." }, { status: 400 });
    }
    updates.follow_up_at = body.follow_up_at;
  }
  if (!Object.keys(updates).length) return Response.json({ error: "No supported updates were provided." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase!.from("outreach_messages").update(updates).eq("id", body.id).eq("user_id", user.id).select("id").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Outreach message not found." }, { status: 404 });
  return Response.json({ saved: true });
}
