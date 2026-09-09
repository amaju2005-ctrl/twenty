import { personFromStoredRows, scoreCandidate, type DiscoveryGoal, type DiscoveryProfile, type PdlPerson } from "@/lib/discovery";
import { hunterApiKey } from "@/lib/hunter";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

type ImportRequest = { urls?: string[] | string };

type HunterSource = { uri?: string | null; domain?: string | null } | string;

type HunterLinkedInResponse = {
  data?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    score?: number | null;
    domain?: string | null;
    position?: string | null;
    company?: string | null;
    linkedin_url?: string | null;
    sources?: HunterSource[] | null;
    verification?: { date?: string | null; status?: string | null } | null;
  } | null;
  errors?: Array<{ details?: string }>;
};

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com", "icloud.com", "me.com",
  "yahoo.com", "proton.me", "protonmail.com", "aol.com", "gmx.com", "mail.com",
]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function linkedinHandle(value: string) {
  const raw = clean(value);
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "https:" || !(url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com"))) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const inIndex = parts.findIndex((part) => part.toLowerCase() === "in");
    const handle = decodeURIComponent(parts[inIndex + 1] || "").trim();
    if (!handle || !/^[\p{L}\p{N}_-]+$/u.test(handle)) return null;
    return handle.toLowerCase();
  } catch {
    return null;
  }
}

function canonicalLinkedInUrl(handle: string) {
  return `https://www.linkedin.com/in/${encodeURIComponent(handle)}`;
}

function sourceUrl(source?: HunterSource) {
  const raw = typeof source === "string" ? source : source?.uri || (source?.domain ? `https://${source.domain}` : "");
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function domainUrl(domain: string) {
  return domain ? `https://${domain.replace(/^https?:\/\//i, "").replace(/\/$/, "")}` : undefined;
}

function contactStatus(email: string, verification: string, score: number) {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (!email || !domain || FREE_EMAIL_DOMAINS.has(domain)) return "unavailable" as const;
  if (verification === "valid") return "verified" as const;
  if (verification === "accept_all" && score >= 70) return "likely" as const;
  return "unavailable" as const;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as ImportRequest;
  const rawUrls = Array.isArray(body.urls) ? body.urls : clean(body.urls).split(/[\n,;]+/);
  const handles = [...new Set(rawUrls.map(linkedinHandle).filter((value): value is string => Boolean(value)))].slice(0, 5);
  if (!handles.length) {
    return Response.json({ error: "Paste at least one valid linkedin.com/in profile URL." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const supabase = await createServerSupabaseClient();
  if (!user || !supabase) return Response.json({ error: "Sign in before importing LinkedIn profiles." }, { status: 401 });
  const hunterKey = hunterApiKey();
  if (!hunterKey) return Response.json({ error: "Hunter is not configured in Vercel." }, { status: 503 });

  const [profileResult, goalResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("career_goals").select("*").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
  ]);
  if (profileResult.error || goalResult.error) return Response.json({ error: "Unable to load your career profile." }, { status: 500 });
  if (!goalResult.data) return Response.json({ error: "Add a career focus before importing people." }, { status: 400 });

  const profile = (profileResult.data || {}) as DiscoveryProfile;
  const goal = goalResult.data as DiscoveryGoal;
  const imported = [];
  const skipped: Array<{ url: string; reason: string }> = [];

  for (const handle of handles) {
    const canonicalUrl = canonicalLinkedInUrl(handle);
    try {
      const url = new URL("https://api.hunter.io/v2/email-finder");
      url.searchParams.set("api_key", hunterKey);
      url.searchParams.set("linkedin_handle", handle);
      url.searchParams.set("max_duration", "10");
      const providerResponse = await fetch(url, { cache: "no-store" });
      const provider = await providerResponse.json().catch(() => ({})) as HunterLinkedInResponse;
      const data = provider.data;
      if (!providerResponse.ok || !data) {
        const reason = provider.errors?.[0]?.details || (providerResponse.status === 404 ? "Hunter has no professional record for this profile." : `Hunter returned ${providerResponse.status}.`);
        skipped.push({ url: canonicalUrl, reason });
        continue;
      }

      const fullName = [clean(data.first_name), clean(data.last_name)].filter(Boolean).join(" ");
      const position = clean(data.position);
      const company = clean(data.company);
      const domain = clean(data.domain).replace(/^https?:\/\//i, "").replace(/\/$/, "");
      if (!fullName || !position || !(company || domain)) {
        skipped.push({ url: canonicalUrl, reason: "The profile did not include enough verified professional context to rank safely." });
        continue;
      }

      const record: PdlPerson = {
        id: handle,
        full_name: fullName,
        first_name: clean(data.first_name),
        last_name: clean(data.last_name),
        job_title: position,
        job_company_name: company || domain,
        job_company_website: domain,
        linkedin_url: canonicalUrl,
        job_last_verified: clean(data.verification?.date),
        experience: [{ company: { name: company || domain, website: domain }, title: { name: position } }],
      };
      const candidate = scoreCandidate(record, profile, goal, "LinkedIn + Hunter");
      if (!candidate) {
        skipped.push({ url: canonicalUrl, reason: "The profile could not be normalized into a professional record." });
        continue;
      }

      const now = new Date().toISOString();
      const sources = [...new Set([canonicalUrl, domainUrl(domain), ...(data.sources || []).map(sourceUrl)].filter((value): value is string => Boolean(value)))];
      const savedPerson = await supabase.from("people").upsert({
        user_id: user.id,
        external_provider: "hunter_linkedin",
        external_id: handle,
        full_name: fullName,
        role_title: position,
        company: company || domain,
        location: "Location not provided",
        headline: `${position} at ${company || domain}`,
        linkedin_url: canonicalUrl,
        profile_data: {
          ...record,
          _twenty: {
            experience: candidate.person.experience,
            education: candidate.person.education,
            tags: ["LinkedIn import", ...candidate.person.tags].slice(0, 4),
            relationship: "Selected by you from LinkedIn",
            dataSource: "LinkedIn URL resolved by Hunter",
          },
        },
        source_urls: sources,
        last_refreshed_at: now,
      }, { onConflict: "user_id,external_provider,external_id" }).select("*").single();
      if (savedPerson.error) throw new Error(savedPerson.error.message);

      const score = Math.max(68, candidate.person.score);
      const savedMatch = await supabase.from("matches").upsert({
        user_id: user.id,
        person_id: savedPerson.data.id,
        goal_id: goal.id,
        relevance_score: score,
        response_fit: candidate.person.responseLikelihood.toLowerCase(),
        rationale: `${candidate.person.rationale} You selected this person directly from LinkedIn, which is a strong intent signal.`,
        signals: ["Selected by you from LinkedIn", ...candidate.person.signals].slice(0, 4),
        score_breakdown: { ...candidate.scoreBreakdown, curated: 8 },
        status: "saved",
        updated_at: now,
      }, { onConflict: "user_id,person_id,goal_id" }).select("*").single();
      if (savedMatch.error) throw new Error(savedMatch.error.message);

      const email = clean(data.email).toLowerCase();
      const verification = clean(data.verification?.status).toLowerCase();
      const confidence = Math.max(0, Math.min(100, Math.round(Number(data.score) || 0)));
      const status = contactStatus(email, verification, confidence);
      const savedContact = await supabase.from("contacts").upsert({
        user_id: user.id,
        person_id: savedPerson.data.id,
        status,
        work_email: status === "unavailable" ? null : email,
        confidence: status === "unavailable" ? null : confidence,
        source_label: "LinkedIn handle resolved by Hunter",
        source_url: sourceUrl(data.sources?.[0]) || canonicalUrl,
        verification_provider: "hunter",
        verified_at: now,
        privacy_note: status === "verified"
          ? "Professional work address verified by Hunter. Keep your note relevant and honour any opt-out."
          : status === "likely"
            ? "Professional address found on an accept-all company domain. Review carefully before sending."
            : "The profile was imported, but no sufficiently reliable professional address was returned.",
        updated_at: now,
      }, { onConflict: "user_id,person_id" }).select("*").single();
      if (savedContact.error) throw new Error(savedContact.error.message);

      imported.push(personFromStoredRows(savedPerson.data, savedMatch.data, savedContact.data));
    } catch (error) {
      skipped.push({ url: canonicalUrl, reason: error instanceof Error ? error.message : "Unexpected import failure." });
    }
  }

  if (!imported.length) {
    return Response.json({ error: skipped[0]?.reason || "No profiles could be imported.", skipped }, { status: 422 });
  }
  return Response.json({ people: imported, importedCount: imported.length, skipped });
}
