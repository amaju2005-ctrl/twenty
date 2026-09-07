import "server-only";

import { getOutreachPerson, outreach as demoOutreach } from "@/lib/data";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

export type OutreachViewStatus = "draft" | "scheduled" | "sent" | "follow_up" | "replied";

export type OutreachViewItem = {
  id: string;
  personId: string | null;
  person: {
    name: string;
    initials: string;
    role: string;
    company: string;
  };
  subject: string;
  status: OutreachViewStatus;
  sentAt?: string;
  sentAtIso?: string;
  nextStep: string;
  updatedAt: string;
};

type PersonRow = {
  id?: string | null;
  full_name?: string | null;
  role_title?: string | null;
  company?: string | null;
};

type OutreachRow = {
  id: string;
  person_id?: string | null;
  to_email?: string | null;
  subject: string;
  status: "draft" | "scheduled" | "sent" | "follow_up_due" | "replied" | "archived";
  sent_at?: string | null;
  scheduled_at?: string | null;
  follow_up_at?: string | null;
  updated_at: string;
  people?: PersonRow | PersonRow[] | null;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function formatTimestamp(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(date).replace(",", " ·");
}

function nextStep(row: OutreachRow) {
  if (row.status === "replied") return "Reply received";
  if (row.status === "follow_up_due") return "Follow-up ready for review";
  if (row.status === "scheduled") return `Scheduled · ${formatTimestamp(row.scheduled_at) || "time pending"}`;
  if (row.status === "draft") return "Review and personalise";
  if (row.follow_up_at) {
    const days = Math.ceil((new Date(row.follow_up_at).getTime() - Date.now()) / 86_400_000);
    if (days <= 0) return "Follow-up ready for review";
    return `Follow up in ${days} day${days === 1 ? "" : "s"}`;
  }
  return "Waiting for a reply";
}

function mapDemoItems(): OutreachViewItem[] {
  return demoOutreach.map((item) => {
    const person = getOutreachPerson(item);
    return {
      id: item.id,
      personId: person.id,
      person: { name: person.name, initials: person.initials, role: person.role, company: person.company },
      subject: item.subject,
      status: item.status,
      sentAt: item.sentAt,
      nextStep: item.nextStep,
      updatedAt: item.updatedAt,
    };
  });
}

function mapLiveItem(row: OutreachRow): OutreachViewItem {
  const relationship = Array.isArray(row.people) ? row.people[0] : row.people;
  const fallbackName = row.to_email?.split("@")[0] || "Professional contact";
  const name = relationship?.full_name || fallbackName;
  const status: OutreachViewStatus = row.status === "follow_up_due" ? "follow_up" : row.status === "archived" ? "draft" : row.status;
  return {
    id: row.id,
    personId: relationship?.id || row.person_id || null,
    person: {
      name,
      initials: initials(name),
      role: relationship?.role_title || "Professional contact",
      company: relationship?.company || row.to_email?.split("@")[1] || "",
    },
    subject: row.subject,
    status,
    sentAt: formatTimestamp(row.sent_at),
    sentAtIso: row.sent_at || undefined,
    nextStep: nextStep(row),
    updatedAt: formatTimestamp(row.updated_at) || "Recently",
  };
}

export async function getOutreachForCurrentUser(): Promise<{ mode: "live" | "demo"; items: OutreachViewItem[] }> {
  const user = await getCurrentUser();
  const supabase = await createServerSupabaseClient();
  if (!user || !supabase) {
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
    return { mode: demoMode ? "demo" : "live", items: demoMode ? mapDemoItems() : [] };
  }

  const { data, error } = await supabase
    .from("outreach_messages")
    .select("id,person_id,to_email,subject,status,sent_at,scheduled_at,follow_up_at,updated_at,people(id,full_name,role_title,company)")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { mode: "live", items: (data || []).map((row) => mapLiveItem(row as OutreachRow)) };
}
