import type { ContactStatus, Person } from "@/lib/types";

export type DiscoveryProfile = {
  full_name?: string | null;
  headline?: string | null;
  cv_text?: string | null;
  location?: string | null;
  skills?: string[] | null;
  experience?: unknown;
  education?: unknown;
};

export type DiscoveryGoal = {
  id?: string | null;
  target_summary?: string | null;
  target_roles?: string[] | null;
  industries?: string[] | null;
  locations?: string[] | null;
  company_stages?: string[] | null;
};

type PdlCompany = {
  name?: string | null;
  website?: string | null;
  industry?: string | null;
};

type PdlTitle = { name?: string | null; role?: string | null; levels?: string[] | null };

type PdlExperience = {
  company?: PdlCompany | string | null;
  title?: PdlTitle | string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type PdlEducation = {
  school?: { name?: string | null } | string | null;
  degrees?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type PdlPerson = {
  id?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  job_title_role?: string | null;
  job_title_levels?: string[] | null;
  job_company_name?: string | null;
  job_company_website?: string | null;
  job_company_industry?: string | null;
  location_name?: string | null;
  location_country?: string | null;
  linkedin_url?: string | null;
  experience?: PdlExperience[] | null;
  education?: PdlEducation[] | null;
  skills?: string[] | null;
  interests?: string[] | null;
  job_start_date?: string | null;
  job_last_verified?: string | null;
  reveal_handle?: string | null;
  hunter_decision_maker?: boolean | null;
  hunter_full_name_exists?: boolean | null;
  hunter_linkedin_exists?: boolean | null;
  hunter_verification?: { date?: string | null; status?: string | null } | null;
};

export type ScoreBreakdown = {
  role: number;
  industry: number;
  location: number;
  path: number;
  completeness: number;
};

export type ScoredCandidate = {
  externalId: string;
  person: Person;
  providerRecord: PdlPerson;
  scoreBreakdown: ScoreBreakdown;
  sourceUrls: string[];
};

type StoredPersonRow = {
  id: string;
  full_name: string;
  role_title?: string | null;
  company?: string | null;
  location?: string | null;
  headline?: string | null;
  linkedin_url?: string | null;
  profile_data?: Record<string, unknown> | null;
  source_urls?: string[] | null;
};

type StoredMatchRow = {
  relevance_score?: number | null;
  response_fit?: string | null;
  rationale?: string | null;
  signals?: unknown;
  score_breakdown?: Record<string, unknown> | null;
};

type StoredContactRow = {
  status?: string | null;
  work_email?: string | null;
  confidence?: number | null;
  source_label?: string | null;
  source_url?: string | null;
  verified_at?: string | null;
  privacy_note?: string | null;
};

const STOP_WORDS = new Set([
  "about", "after", "also", "and", "another", "are", "based", "company", "early", "from", "into",
  "looking", "move", "next", "role", "roles", "stage", "that", "the", "their", "this", "through", "with",
]);

const SENIOR_TITLES = /\b(founder|chief|ceo|cto|cfo|coo|president|partner|managing director|vp|vice president)\b/i;

export const PDL_DATA_INCLUDE = [
  "id",
  "full_name",
  "first_name",
  "last_name",
  "job_title",
  "job_title_role",
  "job_title_levels",
  "job_company_name",
  "job_company_website",
  "job_company_industry",
  "location_name",
  "location_country",
  "linkedin_url",
  "experience",
  "education",
  "skills",
  "interests",
  "job_start_date",
  "job_last_verified",
].join(",");

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function words(values: Array<string | null | undefined>) {
  return unique(values
    .flatMap((value) => clean(value).toLowerCase().split(/[^a-z0-9+#.]+/))
    .filter((value) => value.length > 2 && !STOP_WORDS.has(value)));
}

function overlap(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function profileText(profile: DiscoveryProfile) {
  return [
    profile.headline,
    profile.cv_text,
    profile.location,
    ...(profile.skills || []),
    JSON.stringify(profile.experience || []),
    JSON.stringify(profile.education || []),
  ].filter(Boolean).join(" ");
}

export function splitInput(value?: string | string[] | null) {
  const items = Array.isArray(value) ? value : clean(value).split(/[,;\n]/);
  return unique(items.map((item) => clean(item)).filter(Boolean));
}

function inferredFocusTerms(goal: DiscoveryGoal) {
  const explicit = unique([...(goal.target_roles || []), ...(goal.industries || [])]);
  if (explicit.length) return explicit.slice(0, 12);
  return words([goal.target_summary]).slice(0, 8);
}

export function buildPdlQuery(goal: DiscoveryGoal, locationOverride?: string) {
  const roleTerms = splitInput(goal.target_roles);
  const industryTerms = splitInput(goal.industries);
  const focusTerms = inferredFocusTerms(goal);
  const summaryTerms = words([goal.target_summary]).slice(0, 6);
  const locations = splitInput(locationOverride || goal.locations || []);
  const focusClauses = [
    ...roleTerms.map((value) => ({ match: { job_title: value } })),
    ...industryTerms.flatMap((value) => [
      { match: { job_company_industry: value } },
      { match: { industry: value } },
    ]),
    ...summaryTerms.flatMap((value) => [
      { match: { job_title: value } },
      { match: { job_company_industry: value } },
    ]),
  ];

  if (!focusClauses.length) {
    focusClauses.push(...focusTerms.flatMap((value) => [
      { match: { job_title: value } },
      { match: { job_company_industry: value } },
    ]));
  }

  const must: Array<Record<string, unknown>> = [
    { exists: { field: "full_name" } },
    { exists: { field: "job_title" } },
    { exists: { field: "job_company_name" } },
  ];

  if (focusClauses.length) must.push({ bool: { should: focusClauses, minimum_should_match: 1 } });
  if (locations.length) {
    must.push({
      bool: {
        should: locations.map((value) => ({ match: { location_name: value } })),
        minimum_should_match: 1,
      },
    });
  }

  return { bool: { must } };
}

function companyName(item: PdlExperience) {
  return typeof item.company === "string" ? item.company : clean(item.company?.name);
}

function roleName(item: PdlExperience) {
  return typeof item.title === "string" ? item.title : clean(item.title?.name);
}

function year(value?: string | null) {
  return clean(value).slice(0, 4);
}

function period(item: PdlExperience) {
  const start = year(item.start_date);
  const end = year(item.end_date) || "Now";
  return start ? `${start}–${end}` : end;
}

function normalizeExperience(record: PdlPerson) {
  const history = (record.experience || [])
    .map((item) => ({ company: companyName(item), role: roleName(item), period: period(item) }))
    .filter((item) => item.company && item.role)
    .slice(0, 6);

  if (!history.length && record.job_company_name && record.job_title) {
    history.push({
      company: record.job_company_name,
      role: record.job_title,
      period: year(record.job_start_date) ? `${year(record.job_start_date)}–Now` : "Current",
    });
  }
  return history;
}

function normalizeEducation(record: PdlPerson) {
  return (record.education || []).map((item) => {
    const school = typeof item.school === "string" ? item.school : clean(item.school?.name);
    const degree = (item.degrees || []).filter(Boolean).join(", ");
    return [school, degree].filter(Boolean).join(" · ");
  }).filter(Boolean).slice(0, 4);
}

function normalizeUrl(value?: string | null) {
  const url = clean(value);
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function roleCategory(title: string) {
  if (/invest|venture|capital|portfolio/i.test(title)) return "Venture";
  if (/recruit|talent|people/i.test(title)) return "Talent";
  if (/founder|chief|ceo|cto|coo/i.test(title)) return "Founder";
  if (/product/i.test(title)) return "Product";
  if (/strateg|operation|chief of staff/i.test(title)) return "Operator";
  return "Professional";
}

export function scoreCandidate(record: PdlPerson, profile: DiscoveryProfile, goal: DiscoveryGoal, dataSource = "People Data Labs"): ScoredCandidate | null {
  const externalId = clean(record.id);
  const name = clean(record.full_name);
  const role = clean(record.job_title);
  const company = clean(record.job_company_name);
  if (!externalId || !name || !role || !company) return null;

  const location = clean(record.location_name) || clean(record.location_country) || "Location not listed";
  const industry = clean(record.job_company_industry);
  const roleTokens = words([role, record.job_title_role]);
  const industryTokens = words([industry]);
  const locationTokens = words([location]);
  const goalRoleTokens = words([...(goal.target_roles || []), goal.target_summary]);
  const goalIndustryTokens = words([...(goal.industries || []), goal.target_summary]);
  const goalLocationTokens = words([...(goal.locations || [])]);
  const candidatePathTokens = words([
    role,
    company,
    industry,
    ...(record.skills || []),
    ...(record.experience || []).flatMap((item) => [companyName(item), roleName(item)]),
    ...normalizeEducation(record),
  ]);
  const userPathTokens = words([profileText(profile)]);

  const roleMatches = overlap(goalRoleTokens, roleTokens);
  const industryMatches = overlap(goalIndustryTokens, industryTokens);
  const locationMatches = overlap(goalLocationTokens, locationTokens);
  const pathMatches = overlap(userPathTokens, candidatePathTokens);
  const breakdown: ScoreBreakdown = {
    role: Math.min(30, roleMatches.length * 10),
    industry: Math.min(20, industryMatches.length * 10),
    location: goalLocationTokens.length ? Math.min(15, locationMatches.length * 15) : 8,
    path: Math.min(20, pathMatches.length * 4),
    completeness: Math.min(10, [record.linkedin_url || record.hunter_linkedin_exists, record.experience?.length, record.education?.length, record.skills?.length, record.hunter_full_name_exists].filter(Boolean).length * 2.5),
  };
  const providerBaseline = dataSource === "Hunter" ? 55 : 30;
  const score = Math.round(Math.min(98, providerBaseline + breakdown.role + breakdown.industry + breakdown.location + breakdown.path + breakdown.completeness));
  const category = roleCategory(role);
  const signals = unique([
    record.hunter_decision_maker ? "Decision-maker profile" : "",
    roleMatches.length ? `Target-role alignment: ${role}` : "Relevant adjacent role",
    industryMatches.length || industry ? `${industry || "Target-sector"} experience` : "Relevant professional experience",
    locationMatches.length || !goalLocationTokens.length ? `Based in ${location}` : "Location is outside your primary target",
    pathMatches.length >= 2 ? "Career-path overlap" : "New perspective for your network",
  ]).slice(0, 4);
  const responseLikelihood: Person["responseLikelihood"] = SENIOR_TITLES.test(role) ? "Selective" : score >= 78 ? "High" : "Medium";
  const rationaleParts = [
    `${name} is currently ${role} at ${company}.`,
    roleMatches.length ? "The role overlaps directly with your stated direction." : "The role is adjacent enough to offer a useful perspective.",
    industry ? `Their ${industry} background adds relevant sector context.` : "Their career path adds useful market context.",
    pathMatches.length >= 2 ? "There are also concrete similarities with your background." : "Treat this as a targeted learning conversation rather than a generic networking ask.",
  ];
  const experience = normalizeExperience(record);
  const education = normalizeEducation(record);
  const linkedin = normalizeUrl(record.linkedin_url);
  const website = normalizeUrl(record.job_company_website);
  const sourceUrls = unique([linkedin, website].filter((value): value is string => Boolean(value)));

  return {
    externalId,
    providerRecord: record,
    scoreBreakdown: breakdown,
    sourceUrls,
    person: {
      id: externalId,
      name,
      initials: initials(name),
      role,
      company,
      location,
      score,
      responseLikelihood,
      relationship: signals[0],
      rationale: rationaleParts.join(" "),
      signals,
      experience,
      education,
      contact: {
        status: "not_sought",
        note: "Work email has not been checked. Reveal it only if this person belongs on your shortlist.",
      },
      social: { linkedin, website },
      tags: unique([category, industry, location.split(",")[0], "Live data"]).slice(0, 4),
      dataSource,
      sourceUrls,
    },
  };
}

function contactStatus(value?: string | null): ContactStatus {
  return (["verified", "likely", "unavailable", "not_sought"].includes(value || "") ? value : "not_sought") as ContactStatus;
}

export function personFromStoredRows(row: StoredPersonRow, match?: StoredMatchRow | null, contact?: StoredContactRow | null): Person {
  const profileData = row.profile_data || {};
  const twenty = (profileData._twenty || {}) as Record<string, unknown>;
  const storedExperience = Array.isArray(twenty.experience) ? twenty.experience as Person["experience"] : [];
  const storedEducation = asStringArray(twenty.education);
  const storedTags = asStringArray(twenty.tags);
  const signals = Array.isArray(match?.signals) ? asStringArray(match.signals) : [];
  const name = row.full_name;
  const sourceUrls = row.source_urls || [];
  const linkedin = normalizeUrl(row.linkedin_url);
  const website = normalizeUrl(clean(profileData.job_company_website));

  return {
    id: row.id,
    name,
    initials: initials(name),
    role: row.role_title || "Role not listed",
    company: row.company || "Company not listed",
    location: row.location || "Location not listed",
    score: match?.relevance_score ?? 0,
    responseLikelihood: match?.response_fit === "high" ? "High" : match?.response_fit === "selective" ? "Selective" : "Medium",
    relationship: clean(twenty.relationship) || signals[0] || "Relevant professional path",
    rationale: match?.rationale || "This person matches your current career focus.",
    signals: signals.length ? signals : ["Relevant professional path"],
    experience: storedExperience,
    education: storedEducation,
    contact: {
      status: contactStatus(contact?.status),
      email: contact?.work_email || undefined,
      confidence: contact?.confidence ?? undefined,
      source: contact?.source_label || undefined,
      sourceUrl: contact?.source_url || undefined,
      checkedAt: contact?.verified_at || undefined,
      note: contact?.privacy_note || "Work email has not been checked. Reveal it only if this person belongs on your shortlist.",
    },
    social: { linkedin, website },
    tags: storedTags.length ? storedTags : [roleCategory(row.role_title || "")],
    dataSource: clean(twenty.dataSource) || "Professional data provider",
    sourceUrls,
  };
}
