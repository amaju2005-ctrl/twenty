import OpenAI from "openai";
import { getCurrentUser } from "@/lib/supabase/server";

type DraftRequest = {
  person: { name: string; role: string; company: string; rationale: string; signals: string[] };
  profile: { name: string; headline: string; target: string };
  tone?: string;
  intent?: string;
};

function fallbackDraft(input: DraftRequest) {
  const first = input.person.name.split(" ")[0];
  const signal = input.person.signals[0] || input.person.role;
  return {
    subject: `${signal} — a quick question`,
    body: `Hi ${first},\n\nI came across your path while researching people with relevant experience in ${input.person.role.toLowerCase()} work. Your ${signal.toLowerCase()} stood out, particularly your role at ${input.person.company}.\n\nI’m currently ${input.profile.headline.toLowerCase()} and exploring ${input.profile.target.toLowerCase()}. What have you found most important for someone trying to make that move thoughtfully?\n\nIf you had 15 minutes for a quick call, I’d really value your perspective. No worries at all if timing is tight.\n\nBest,\n${input.profile.name.split(" ")[0]}`,
    mode: "fallback",
  };
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => null) as DraftRequest | null;
  if (!input?.person?.name?.trim() || !input.person.role?.trim() || !input.person.company?.trim()
    || !input.profile?.name?.trim() || !input.profile.headline?.trim() || !input.profile.target?.trim()
    || !Array.isArray(input.person.signals)) {
    return Response.json({ error: "A valid sender and recipient profile is required." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  if (!user && !demoMode) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!user || !process.env.OPENAI_API_KEY) return Response.json(fallbackDraft(input));
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input: [
        { role: "system", content: "You write honest, concise career outreach. Never invent familiarity, achievements, or personal details. Keep the body under 125 words, make one clear low-pressure ask, and avoid flattery. Return strict JSON with subject and body strings." },
        { role: "user", content: JSON.stringify({ sender: input.profile, recipient: input.person, tone: input.tone, intent: input.intent }) },
      ],
    });
    const parsed = JSON.parse(response.output_text) as { subject: string; body: string };
    return Response.json({ ...parsed, mode: "ai" });
  } catch {
    return Response.json(fallbackDraft(input));
  }
}
