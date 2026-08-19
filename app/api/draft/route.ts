import OpenAI from "openai";

type DraftRequest = {
  person: { name: string; role: string; company: string; rationale: string; signals: string[] };
  profile: { name: string; headline: string; target: string };
  tone?: string;
  intent?: string;
};

function fallbackDraft(input: DraftRequest) {
  const first = input.person.name.split(" ")[0];
  return {
    subject: `${input.person.signals[0]} — a quick question`,
    body: `Hi ${first},\n\nI came across your path while looking into people who have made thoughtful moves into climate work. Your ${input.person.signals[0].toLowerCase()} stood out, particularly your role at ${input.person.company}.\n\nI’m currently in strategy and exploring an early-stage climate operator move. What did you find most different about doing this work in a smaller, mission-led team?\n\nIf you had 15 minutes for a quick call, I’d really value your perspective. No worries at all if timing is tight.\n\nBest,\n${input.profile.name.split(" ")[0]}`,
    mode: "fallback",
  };
}

export async function POST(request: Request) {
  const input = await request.json() as DraftRequest;
  if (!process.env.OPENAI_API_KEY) return Response.json(fallbackDraft(input));
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
