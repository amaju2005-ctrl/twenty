import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ mode: "demo", profile: null });
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase!.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ mode: "live", profile: data });
}

export async function POST(request: Request) {
  const body = await request.json() as { cvText?: string; target?: string; industries?: string[]; fullName?: string; headline?: string; linkedinUrl?: string };
  const user = await getCurrentUser();
  if (!user) return Response.json({ mode: "demo", saved: true });
  const supabase = await createServerSupabaseClient();
  const { error: profileError } = await supabase!.from("profiles").upsert({
    id: user.id,
    full_name: body.fullName || user.user_metadata?.full_name || user.email?.split("@")[0],
    headline: body.headline,
    linkedin_url: body.linkedinUrl,
    cv_text: body.cvText,
    onboarding_completed: true,
  });
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 });
  if (body.target) {
    const { error: goalError } = await supabase!.from("career_goals").upsert({ user_id: user.id, target_summary: body.target, industries: body.industries || [], is_active: true }, { onConflict: "user_id,is_active" });
    if (goalError) return Response.json({ error: goalError.message }, { status: 500 });
  }
  return Response.json({ mode: "live", saved: true });
}
