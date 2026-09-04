import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  const supabase = await createServerSupabaseClient();
  let gmailConnected = false;
  if (user && supabase) {
    const result = await supabase.from("gmail_connections").select("user_id").eq("user_id", user.id).maybeSingle();
    gmailConnected = Boolean(result.data);
  }
  return Response.json({
    discoveryConfigured: Boolean(process.env.PEOPLE_DATA_LABS_API_KEY),
    emailFinderConfigured: Boolean(process.env.HUNTER_API_KEY),
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    gmailConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    gmailConnected,
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
  });
}
