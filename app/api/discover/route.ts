import { people } from "@/lib/data";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { query?: string; location?: string; limit?: number };
  if (!process.env.PEOPLE_DATA_LABS_API_KEY) return Response.json({ mode: "mock", people: people.slice(0, body.limit || 12) });
  try {
    const query = body.query || "climate strategy London";
    const response = await fetch("https://api.peopledatalabs.com/v5/person/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": process.env.PEOPLE_DATA_LABS_API_KEY },
      body: JSON.stringify({ query: { bool: { must: [{ query_string: { query } }] } }, size: Math.min(body.limit || 20, 20) }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Provider request failed");
    const result = await response.json();
    return Response.json({ mode: "provider", raw: result, note: "Score provider results against the authenticated profile before display." });
  } catch {
    return Response.json({ mode: "mock", people: people.slice(0, body.limit || 12), providerError: true });
  }
}
