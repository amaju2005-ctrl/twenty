import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

type HunterSource = { uri?: string; domain?: string } | string;
type HunterFinderResponse = {
  data?: {
    email?: string | null;
    score?: number | null;
    type?: string | null;
    verification?: { status?: string | null } | null;
    sources?: HunterSource[] | null;
  };
  errors?: Array<{ details?: string }>;
};

type HunterRevealResponse = {
  data?: Array<{
    reveal_handle?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    position?: string | null;
    linkedin_url?: string | null;
    score?: number | null;
    verification?: { status?: string | null } | null;
    sources?: HunterSource[] | null;
  }>;
  errors?: Array<{ details?: string }>;
};

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com", "icloud.com", "me.com",
  "yahoo.com", "proton.me", "protonmail.com", "aol.com", "gmx.com", "mail.com",
]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function companyDomain(value: unknown) {
  const raw = clean(value);
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function sourceUrl(source?: HunterSource) {
  const value = typeof source === "string" ? source : source?.uri || (source?.domain ? `https://${source.domain}` : "");
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function isRecent(value?: string | null) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() < 30 * 24 * 60 * 60 * 1000;
}

function publicContact(row: Record<string, unknown>) {
  return {
    status: row.status,
    email: row.work_email || undefined,
    confidence: row.confidence ?? undefined,
    source: row.source_label || undefined,
    sourceUrl: row.source_url || undefined,
    checkedAt: row.verified_at || undefined,
    note: row.privacy_note,
  };
}

export async function POST(request: Request) {
  const { personId } = await request.json().catch(() => ({})) as { personId?: string };
  if (!personId) return Response.json({ error: "Person ID is required." }, { status: 400 });

  const user = await getCurrentUser();
  const supabase = await createServerSupabaseClient();
  if (!user || !supabase) return Response.json({ error: "Sign in before finding a work email." }, { status: 401 });

  const cached = await supabase.from("contacts").select("*").eq("user_id", user.id).eq("person_id", personId).maybeSingle();
  if (cached.data && cached.data.status !== "not_sought" && isRecent(cached.data.verified_at)) {
    return Response.json({ mode: "cache", contact: publicContact(cached.data) });
  }

  const personResult = await supabase.from("people").select("*").eq("id", personId).eq("user_id", user.id).maybeSingle();
  if (personResult.error || !personResult.data) return Response.json({ error: "Person not found in your shortlist." }, { status: 404 });
  if (!process.env.HUNTER_API_KEY) return Response.json({ error: "Hunter is not configured in Vercel." }, { status: 503 });

  const person = personResult.data;
  const providerData = (person.profile_data || {}) as Record<string, unknown>;
  const nameParts = clean(person.full_name).split(/\s+/).filter(Boolean);
  const firstName = clean(providerData.first_name) || nameParts[0] || "";
  const lastName = clean(providerData.last_name) || nameParts.slice(1).join(" ");
  const domain = companyDomain(providerData.job_company_website);
  const revealHandle = clean(providerData.reveal_handle);
  if (!revealHandle && (!firstName || !lastName || (!domain && !person.company))) {
    return Response.json({ error: "This profile does not contain enough verified professional context for email lookup." }, { status: 422 });
  }

  try {
    let foundEmail = "";
    let verification = "";
    let score = 0;
    let firstSource: string | undefined;
    let revealedIdentity: { firstName?: string; lastName?: string; linkedin?: string } | undefined;

    if (revealHandle) {
      const url = new URL("https://api.hunter.io/v2/multi-domain-search/reveal");
      url.searchParams.set("api_key", process.env.HUNTER_API_KEY);
      const providerResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles: [revealHandle] }),
        cache: "no-store",
      });
      const provider = await providerResponse.json().catch(() => ({})) as HunterRevealResponse;
      if (!providerResponse.ok) {
        const detail = provider.errors?.[0]?.details || `Provider returned ${providerResponse.status}`;
        return Response.json({ error: `Hunter reveal error: ${detail}` }, { status: 502 });
      }
      const revealed = provider.data?.[0];
      if (!revealed) return Response.json({ error: "Hunter could not reveal this result. Run discovery again to refresh it." }, { status: 404 });
      const storedVerification = providerData.hunter_verification as { status?: string | null } | undefined;
      foundEmail = clean(revealed.email).toLowerCase();
      verification = clean(revealed.verification?.status || storedVerification?.status).toLowerCase();
      score = Math.max(0, Math.min(100, Math.round(Number(revealed.score) || (verification === "valid" ? 95 : 0))));
      firstSource = sourceUrl(revealed.sources?.[0]) || sourceUrl(revealed.linkedin_url || undefined);
      revealedIdentity = {
        firstName: clean(revealed.first_name) || undefined,
        lastName: clean(revealed.last_name) || undefined,
        linkedin: sourceUrl(revealed.linkedin_url || undefined),
      };
    } else {
      const url = new URL("https://api.hunter.io/v2/email-finder");
      url.searchParams.set("api_key", process.env.HUNTER_API_KEY);
      url.searchParams.set("first_name", firstName);
      url.searchParams.set("last_name", lastName);
      url.searchParams.set("max_duration", "10");
      if (domain) url.searchParams.set("domain", domain);
      else url.searchParams.set("company", person.company);
      const providerResponse = await fetch(url, { cache: "no-store" });
      const provider = await providerResponse.json().catch(() => ({})) as HunterFinderResponse;
      if (!providerResponse.ok) {
        const detail = provider.errors?.[0]?.details || `Provider returned ${providerResponse.status}`;
        return Response.json({ error: `Email provider error: ${detail}` }, { status: 502 });
      }
      foundEmail = clean(provider.data?.email).toLowerCase();
      verification = clean(provider.data?.verification?.status).toLowerCase();
      score = Math.max(0, Math.min(100, Math.round(Number(provider.data?.score) || 0)));
      firstSource = sourceUrl(provider.data?.sources?.[0]);
    }

    const emailDomain = foundEmail.split("@")[1] || "";
    const professional = Boolean(foundEmail && emailDomain && !FREE_EMAIL_DOMAINS.has(emailDomain));
    const status = !professional ? "unavailable" : verification === "valid" ? "verified" : score >= 70 ? "likely" : "unavailable";
    const sourceLabel = firstSource ? "Public professional source + Hunter verification" : professional ? "Hunter company-pattern match" : "Hunter lookup";
    const privacyNote = status === "verified"
      ? "Professional work address verified by Hunter. Keep the message relevant and honour any opt-out."
      : status === "likely"
        ? "Professional address found, but the company domain could not confirm every mailbox. Review before sending."
        : "No sufficiently reliable professional address was found. Twenty will not reveal personal or low-confidence addresses.";
    const now = new Date().toISOString();
    const saved = await supabase.from("contacts").upsert({
      user_id: user.id,
      person_id: personId,
      status,
      work_email: status === "unavailable" ? null : foundEmail,
      confidence: professional ? score : null,
      source_label: sourceLabel,
      source_url: firstSource || null,
      verification_provider: "hunter",
      verified_at: now,
      privacy_note: privacyNote,
      updated_at: now,
    }, { onConflict: "user_id,person_id" }).select("*").single();
    if (saved.error) return Response.json({ error: "Email was checked but could not be saved." }, { status: 500 });

    if (revealedIdentity) {
      const revealedName = [revealedIdentity.firstName, revealedIdentity.lastName].filter(Boolean).join(" ");
      await supabase.from("people").update({
        full_name: revealedName || person.full_name,
        linkedin_url: revealedIdentity.linkedin || person.linkedin_url,
        profile_data: {
          ...providerData,
          first_name: revealedIdentity.firstName || providerData.first_name,
          last_name: revealedIdentity.lastName || providerData.last_name,
          linkedin_url: revealedIdentity.linkedin || providerData.linkedin_url,
        },
        last_refreshed_at: now,
      }).eq("id", personId).eq("user_id", user.id);
    }
    return Response.json({ mode: "live", contact: publicContact(saved.data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected provider failure";
    return Response.json({ error: `Email lookup failed: ${message}` }, { status: 502 });
  }
}
