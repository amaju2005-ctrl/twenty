export async function POST(request: Request) {
  const { email } = await request.json() as { email?: string };
  if (!email) return Response.json({ error: "Email is required" }, { status: 400 });
  if (!process.env.HUNTER_API_KEY) return Response.json({ mode: "mock", status: "unknown", score: null, message: "Verification provider is not configured." });
  const url = new URL("https://api.hunter.io/v2/email-verifier");
  url.searchParams.set("email", email);
  url.searchParams.set("api_key", process.env.HUNTER_API_KEY);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return Response.json({ error: "Verification provider failed" }, { status: 502 });
  const result = await response.json();
  return Response.json({ mode: "provider", status: result.data?.status, score: result.data?.score, sources: result.data?.sources?.length || 0 });
}
