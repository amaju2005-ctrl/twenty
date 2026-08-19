import { AppShell } from "@/components/app-shell";
import { demoUser } from "@/lib/data";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const authUser = await getCurrentUser();
  let shellUser = demoUser;
  if (authUser) {
    const supabase = await createServerSupabaseClient();
    const { data: profile } = await supabase!.from("profiles").select("full_name,headline").eq("id", authUser.id).maybeSingle();
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
  }
  return <AppShell user={shellUser}>{children}</AppShell>;
}
