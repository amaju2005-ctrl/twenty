import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";
import { hunterApiKey } from "@/lib/hunter";

export async function GET() {
  const hunterKey = hunterApiKey();
  const user = await getCurrentUser();
  const supabase = await createServerSupabaseClient();
  let gmailConnected = false;
  if (user && supabase) {
    const result = await supabase.from("gmail_connections").select("user_id").eq("user_id", user.id).maybeSingle();
    gmailConnected = Boolean(result.data);
  }
  return Response.json({
    supabaseConfigured: Boolean(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
      && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ),
    supabaseAdminConfigured: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    discoveryConfigured: Boolean(hunterKey || process.env.PEOPLE_DATA_LABS_API_KEY),
    emailFinderConfigured: Boolean(hunterKey),
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    gmailConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    gmailConnected,
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
  });
}
