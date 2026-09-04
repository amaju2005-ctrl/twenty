import { getCurrentUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await request.json().catch(() => ({})) as { email?: string };
  if (!email) return Response.json({ error: "Email is required" }, { status: 400 });
  if (!process.env.HUNTER_API_KEY) return Response.json({ error: "Hunter is not configured in Vercel." }, { status: 503 });

  const url = new URL("https://api.hunter.io/v2/email-verifier");
  url.searchParams.set("email", email);
  url.searchParams.set("api_key", process.env.HUNTER_API_KEY);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return Response.json({ error: "Verification provider failed" }, { status: 502 });
  const result = await response.json();
  return Response.json({
    mode: "live",
    status: result.data?.status,
    score: result.data?.score,
    sources: result.data?.sources?.length || 0,
  });
}
