import { people as demoPeople, demoUser, getPerson as getDemoPerson } from "@/lib/data";
import { personFromStoredRows } from "@/lib/discovery";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";
import type { Person } from "@/lib/types";

export type PeopleMode = "live" | "demo";

export type SenderProfile = {
  name: string;
  firstName: string;
  email: string;
  headline: string;
  target: string;
};

function demoEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
}

export async function getPeopleForCurrentUser(): Promise<{ mode: PeopleMode; people: Person[] }> {
  const user = await getCurrentUser();
  const supabase = await createServerSupabaseClient();
  if (!user || !supabase) return { mode: "demo", people: demoEnabled() ? demoPeople : [] };

  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select("person_id,relevance_score,response_fit,rationale,signals,score_breakdown")
    .eq("user_id", user.id)
    .neq("status", "dismissed")
    .order("relevance_score", { ascending: false })
    .limit(20);
  if (matchError) throw new Error(matchError.message);
  if (!matches?.length) return { mode: "live", people: [] };

  const personIds = matches.map((match) => match.person_id);
  const [peopleResult, contactsResult] = await Promise.all([
    supabase.from("people").select("*").eq("user_id", user.id).in("id", personIds),
    supabase.from("contacts").select("*").eq("user_id", user.id).in("person_id", personIds),
  ]);
  if (peopleResult.error) throw new Error(peopleResult.error.message);
  if (contactsResult.error) throw new Error(contactsResult.error.message);

  const peopleById = new Map((peopleResult.data || []).map((person) => [person.id, person]));
  const contactsByPerson = new Map((contactsResult.data || []).map((contact) => [contact.person_id, contact]));
  const result = matches.flatMap((match) => {
    const person = peopleById.get(match.person_id);
    return person ? [personFromStoredRows(person, match, contactsByPerson.get(match.person_id))] : [];
  });
  return { mode: "live", people: result };
}

export async function getPersonForCurrentUser(id: string): Promise<Person | null> {
  const user = await getCurrentUser();
  const supabase = await createServerSupabaseClient();
  if (!user || !supabase) return demoEnabled() ? getDemoPerson(id) || null : null;

  const [personResult, matchResult, contactResult] = await Promise.all([
    supabase.from("people").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("matches").select("relevance_score,response_fit,rationale,signals,score_breakdown").eq("person_id", id).eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("contacts").select("*").eq("person_id", id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (personResult.error) throw new Error(personResult.error.message);
  if (!personResult.data) return null;
  return personFromStoredRows(personResult.data, matchResult.data, contactResult.data);
}

export async function getSenderProfileForCurrentUser(): Promise<SenderProfile> {
  const user = await getCurrentUser();
  const supabase = await createServerSupabaseClient();
  if (!user || !supabase) return demoUser;

  const [profileResult, goalResult, gmailResult] = await Promise.all([
    supabase.from("profiles").select("full_name,headline").eq("id", user.id).maybeSingle(),
    supabase.from("career_goals").select("target_summary").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
    supabase.from("gmail_connections").select("gmail_address").eq("user_id", user.id).maybeSingle(),
  ]);
  const name = profileResult.data?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Twenty user";
  return {
    name,
    firstName: name.split(/\s+/)[0],
    email: gmailResult.data?.gmail_address || user.email || "Connect Gmail in Settings",
    headline: profileResult.data?.headline || "Exploring the next step in my career",
    target: goalResult.data?.target_summary || "Learn from people with relevant career experience",
  };
}
