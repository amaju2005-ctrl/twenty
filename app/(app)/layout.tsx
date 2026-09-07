import { AppShell } from "@/components/app-shell";
import { demoUser } from "@/lib/data";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const authUser = await getCurrentUser();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  let shellUser = demoUser;
  let shellFocus = { title: "Climate tech", detail: "Strategy & operations · London" };
  let outreachAttentionCount = demoMode ? 2 : 0;
  let shortlistCount = demoMode ? 12 : 0;
  if (authUser) {
    const supabase = await createServerSupabaseClient();
    const [profileResult, goalResult, outreachResult, shortlistResult] = await Promise.all([
      supabase!.from("profiles").select("full_name,headline").eq("id", authUser.id).maybeSingle(),
      supabase!.from("career_goals").select("target_summary,target_roles,industries,locations").eq("user_id", authUser.id).eq("is_active", true).maybeSingle(),
      supabase!.from("outreach_messages").select("id", { count: "exact", head: true }).eq("user_id", authUser.id).eq("status", "follow_up_due"),
      supabase!.from("matches").select("id", { count: "exact", head: true }).eq("user_id", authUser.id).neq("status", "dismissed"),
    ]);
    const profile = profileResult.data;
    const goal = goalResult.data;
    const name = profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Twenty member";
    const parts = name.trim().split(/\s+/);
    shellUser = {
      ...demoUser,
      name,
      firstName: parts[0],
      email: authUser.email || demoUser.email,
      initials: `${parts[0]?.[0] || "T"}${parts[1]?.[0] || ""}`.toUpperCase(),
      headline: profile?.headline || demoUser.headline,
    };
    const focusTitle = goal?.industries?.[0] || goal?.target_summary || "Set your career focus";
    const focusDetails = [goal?.target_roles?.[0], goal?.locations?.[0]].filter(Boolean);
    shellFocus = {
      title: focusTitle,
      detail: focusDetails.join(" · ") || "Add roles and locations",
    };
    outreachAttentionCount = outreachResult.count || 0;
    shortlistCount = Math.min(shortlistResult.count || 0, 20);
  }
  return <AppShell user={shellUser} focus={shellFocus} outreachAttentionCount={outreachAttentionCount} shortlistCount={shortlistCount}>{children}</AppShell>;
}
