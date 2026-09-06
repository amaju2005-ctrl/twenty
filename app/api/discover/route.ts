import {
  buildPdlQuery,
  PDL_DATA_INCLUDE,
  personFromStoredRows,
  scoreCandidate,
  splitInput,
  type DiscoveryGoal,
  type DiscoveryProfile,
  type PdlPerson,
} from "@/lib/discovery";
import { people as demoPeople } from "@/lib/data";
import { buildHunterSearchUrl, hunterApiKey, hunterPersonRecord, type HunterSearchResponse } from "@/lib/hunter";
import { getPeopleForCurrentUser } from "@/lib/people-server";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

type DiscoverRequest = {
  query?: string;
  roles?: string[] | string;
  industries?: string[] | string;
  locations?: string[] | string;
  location?: string;
  limit?: number;
};

type PdlResponse = {
  status?: number;
  data?: PdlPerson[];
  total?: number;
  error?: { message?: string };
};

function demoEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
}

function clampLimit(value?: number) {
  return Math.max(1, Math.min(Number.isFinite(value) ? Math.round(value!) : 20, 20));
}

export async function GET() {
  try {
    const result = await getPeopleForCurrentUser();
    return Response.json(result);
  } catch {
    return Response.json({ error: "Unable to load your shortlist." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as DiscoverRequest;
  const user = await getCurrentUser();
  const supabase = await createServerSupabaseClient();
  const limit = clampLimit(body.limit);

  if (!user || !supabase) {
    if (demoEnabled()) return Response.json({ mode: "demo", people: demoPeople.slice(0, limit) });
    return Response.json({ error: "Sign in before running discovery." }, { status: 401 });
  }

  const [profileResult, goalResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("career_goals").select("*").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
  ]);
  if (profileResult.error || goalResult.error) return Response.json({ error: "Unable to load your career profile." }, { status: 500 });

  let storedGoal = goalResult.data as DiscoveryGoal | null;
  if (!storedGoal) {
    const target = body.query?.trim();
    if (!target) return Response.json({ error: "Complete your career focus or enter a discovery query first." }, { status: 400 });
    const created = await supabase.from("career_goals").insert({
      user_id: user.id,
      target_summary: target,
      target_roles: splitInput(body.roles),
      industries: splitInput(body.industries),
      locations: splitInput(body.locations || body.location),
      is_active: true,
    }).select("*").single();
    if (created.error) return Response.json({ error: "Unable to save your career focus." }, { status: 500 });
    storedGoal = created.data;
  }
  if (!storedGoal) return Response.json({ error: "Unable to establish an active career focus." }, { status: 500 });

  const requestedRoles = splitInput(body.roles);
  const requestedIndustries = splitInput(body.industries);
  const requestedLocations = splitInput(body.locations || body.location);
  const goal: DiscoveryGoal = {
    ...storedGoal,
    target_summary: body.query?.trim() || storedGoal.target_summary,
    target_roles: requestedRoles.length ? requestedRoles : storedGoal.target_roles,
    industries: requestedIndustries.length ? requestedIndustries : storedGoal.industries,
    locations: requestedLocations.length ? requestedLocations : storedGoal.locations,
  };
  const profile = (profileResult.data || {}) as DiscoveryProfile;

  const pdlKey = process.env.PEOPLE_DATA_LABS_API_KEY;
  const hunterKey = hunterApiKey();
  if (!pdlKey && !hunterKey) {
    if (demoEnabled()) return Response.json({ mode: "demo", people: demoPeople.slice(0, limit), message: "No live discovery provider is configured." });
    return Response.json({ error: "Add HUNTER_API_KEY in Vercel to enable live discovery." }, { status: 503 });
  }

  try {
    let providerRecords: PdlPerson[] = [];
    let totalProviderMatches = 0;
    let externalProvider = "people_data_labs";
    let dataSource = "People Data Labs";

    if (pdlKey) {
      const providerResponse = await fetch("https://api.peopledatalabs.com/v5/person/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": pdlKey,
        },
        body: JSON.stringify({
          size: limit,
          dataset: "resume",
          titlecase: true,
          data_include: PDL_DATA_INCLUDE,
          query: buildPdlQuery(goal, body.location),
        }),
        cache: "no-store",
      });
      const provider = await providerResponse.json().catch(() => ({})) as PdlResponse;
      if (!providerResponse.ok) {
        const providerMessage = provider.error?.message || `Provider returned ${providerResponse.status}`;
        return Response.json({ error: `Discovery provider error: ${providerMessage}` }, { status: 502 });
      }
      providerRecords = provider.data || [];
      totalProviderMatches = provider.total || providerRecords.length;
    } else if (hunterKey) {
      externalProvider = "hunter";
      dataSource = "Hunter";
      const providerResponse = await fetch(buildHunterSearchUrl(hunterKey, goal, limit), {
        method: "POST",
        cache: "no-store",
      });
      const provider = await providerResponse.json().catch(() => ({})) as HunterSearchResponse;
      if (!providerResponse.ok) {
        const detail = provider.errors?.[0]?.details || `Provider returned ${providerResponse.status}`;
        return Response.json({ error: `Hunter discovery error: ${detail}` }, { status: 502 });
      }
      providerRecords = (provider.data || []).flatMap((record) => {
        const normalized = hunterPersonRecord(record);
        return normalized ? [normalized] : [];
      });
      totalProviderMatches = provider.meta?.results || providerRecords.length;
    }

    const candidates = providerRecords
      .flatMap((record) => {
        const candidate = scoreCandidate(record, profile, goal, dataSource);
        return candidate ? [candidate] : [];
      })
      .sort((left, right) => right.person.score - left.person.score)
      .slice(0, limit);
    if (!candidates.length) return Response.json({ mode: "live", people: [], totalProviderMatches, provider: dataSource });

    const now = new Date().toISOString();
    const peoplePayload = candidates.map((candidate) => ({
      user_id: user.id,
      external_provider: externalProvider,
      external_id: candidate.externalId,
      full_name: candidate.person.name,
      role_title: candidate.person.role,
      company: candidate.person.company,
      location: candidate.person.location,
      headline: `${candidate.person.role} at ${candidate.person.company}`,
      linkedin_url: candidate.person.social?.linkedin || null,
      profile_data: {
        ...candidate.providerRecord,
        _twenty: {
          experience: candidate.person.experience,
          education: candidate.person.education,
          tags: candidate.person.tags,
          relationship: candidate.person.relationship,
          dataSource,
        },
      },
      source_urls: candidate.sourceUrls,
      last_refreshed_at: now,
    }));
    const savedPeople = await supabase.from("people").upsert(peoplePayload, {
      onConflict: "user_id,external_provider,external_id",
    }).select("*");
    if (savedPeople.error) return Response.json({ error: `Unable to save discovery results: ${savedPeople.error.message}` }, { status: 500 });

    const candidatesByExternalId = new Map(candidates.map((candidate) => [candidate.externalId, candidate]));
    const matchPayload = (savedPeople.data || []).flatMap((saved) => {
      const candidate = candidatesByExternalId.get(saved.external_id);
      if (!candidate) return [];
      return [{
        user_id: user.id,
        person_id: saved.id,
        goal_id: storedGoal.id,
        relevance_score: candidate.person.score,
        response_fit: candidate.person.responseLikelihood.toLowerCase(),
        rationale: candidate.person.rationale,
        signals: candidate.person.signals,
        score_breakdown: candidate.scoreBreakdown,
        status: "suggested",
        updated_at: now,
      }];
    });
    const savedMatches = await supabase.from("matches").upsert(matchPayload, {
      onConflict: "user_id,person_id,goal_id",
    }).select("*");
    if (savedMatches.error) return Response.json({ error: `Unable to save match scores: ${savedMatches.error.message}` }, { status: 500 });

    const personIds = (savedPeople.data || []).map((person) => person.id);
    const contactsResult = await supabase.from("contacts").select("*").eq("user_id", user.id).in("person_id", personIds);
    const contactsByPerson = new Map((contactsResult.data || []).map((contact) => [contact.person_id, contact]));
    const matchByPerson = new Map((savedMatches.data || []).map((match) => [match.person_id, match]));
    const people = (savedPeople.data || [])
      .map((person) => personFromStoredRows(person, matchByPerson.get(person.id), contactsByPerson.get(person.id)))
      .sort((left, right) => right.score - left.score);
    return Response.json({ mode: "live", people, totalProviderMatches: totalProviderMatches || people.length, provider: dataSource });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected provider failure";
    return Response.json({ error: `Discovery failed: ${message}` }, { status: 502 });
  }
}
