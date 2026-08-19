import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ mode: "demo", messages: [] });
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase!.from("outreach_messages").select("*, people(*)").eq("user_id", user.id).order("updated_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ mode: "live", messages: data });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ mode: "demo", saved: true });
  const { id, ...updates } = await request.json() as { id: string; status?: string; follow_up_at?: string };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase!.from("outreach_messages").update(updates).eq("id", id).eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ saved: true });
}
