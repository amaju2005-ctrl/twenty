import type { DiscoveryGoal, PdlPerson } from "@/lib/discovery";

export function hunterApiKey() {
  return process.env.HUNTER_API_KEY || process.env.HUNTERAPIKEY;
}

type HunterVerification = {
  date?: string | null;
  status?: string | null;
};

export type HunterMaskedPerson = {
  reveal_handle?: string | null;
  name?: string | null;
  position?: string | null;
  department?: string | null;
  seniority?: string | null;
  type?: string | null;
  decision_maker?: boolean | null;
  domain?: string | null;
  company_name?: string | null;
  full_name_exists?: boolean | null;
  phone_number_exists?: boolean | null;
  linkedin_exists?: boolean | null;
  verification?: HunterVerification | null;
};

export type HunterSearchResponse = {
  data?: HunterMaskedPerson[];
  meta?: {
    results?: number;
    next_search_after?: string | null;
  };
  errors?: Array<{ details?: string }>;
};

export type HunterCompany = {
  domain?: string | null;
  organization?: string | null;
  emails_count?: {
    personal?: number | null;
    generic?: number | null;
    total?: number | null;
  } | null;
};

export type HunterCompanyDiscoveryResponse = {
  data?: HunterCompany[];
  meta?: { results?: number | null };
  errors?: Array<{ details?: string }>;
};

export type HunterSearchAttempt = {
  label: "company-role" | "company-seniority" | "company-wide" | "location-role" | "role-wide" | "seniority-wide";
  url: URL;
};

const DEPARTMENT_RULES: Array<[RegExp, string]> = [
  [/founder|chief|\bceo\b|\bcto\b|\bcfo\b|\bcoo\b|partner|president/i, "executive"],
  [/invest|venture|capital|bank|financ|account/i, "finance"],
  [/software|engineer|developer|technology|\bit\b|data|security/i, "it"],
  [/product/i, "product"],
  [/research|scientist/i, "research"],
  [/consult/i, "consulting"],
  [/strateg|management|chief of staff/i, "management"],
  [/operation|chief of staff/i, "operations"],
  [/recruit|talent|people|human resources|\bhr\b/i, "hr"],
  [/market|growth|brand/i, "marketing"],
  [/sales|business development|partnership/i, "sales"],
  [/design|creative/i, "design"],
  [/legal|counsel/i, "legal"],
  [/health|medical|clinical/i, "health"],
  [/education|teacher|academic/i, "education"],
];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function titleCaseCompany(value: string) {
  if (!value) return "Company not listed";
  if (/[A-Z]/.test(value)) return value;
  return value.split(/([\s-]+)/).map((part) => /^[a-z]/.test(part) ? `${part[0].toUpperCase()}${part.slice(1)}` : part).join("");
}

function departmentsFor(goal: DiscoveryGoal) {
  const focus = [...(goal.target_roles || []), goal.target_summary || ""].join(" ");
  return unique(DEPARTMENT_RULES.filter(([pattern]) => pattern.test(focus)).map(([, department]) => department)).slice(0, 4);
}

function senioritiesFor(goal: DiscoveryGoal) {
  const focus = [...(goal.target_roles || []), goal.target_summary || ""].join(" ");
  if (/founder|chief|\bceo\b|\bcto\b|\bcfo\b|\bcoo\b|partner|president|vice president|\bvp\b|director|head of/i.test(focus)) {
    return ["executive", "senior"];
  }
  return ["senior"];
}

function countryHint(value: string) {
  const normalized = value.toLowerCase();
  if (/\b(london|england|scotland|wales|northern ireland|united kingdom|great britain|\buk\b)\b/.test(normalized)) return "GB";
  if (/\b(new york|san francisco|los angeles|boston|chicago|seattle|united states|\busa?\b)\b/.test(normalized)) return "US";
  if (/\b(paris|france)\b/.test(normalized)) return "FR";
  if (/\b(berlin|munich|germany)\b/.test(normalized)) return "DE";
  if (/\b(amsterdam|netherlands)\b/.test(normalized)) return "NL";
  if (/\b(dublin|ireland)\b/.test(normalized)) return "IE";
  if (/\b(toronto|vancouver|canada)\b/.test(normalized)) return "CA";
  if (/\b(sydney|melbourne|australia)\b/.test(normalized)) return "AU";
  return "";
}

export function buildHunterCompanyQuery(goal: DiscoveryGoal) {
  const sectors = unique([...(goal.industries || []), goal.target_summary || ""]);
  const locations = unique(goal.locations || []);
  const roles = unique(goal.target_roles || []);
  const parts = [
    sectors.length ? `Companies relevant to ${sectors.join(", ")}` : "Companies relevant to the user's career direction",
    locations.length ? `based in or with teams in ${locations.join(", ")}` : "",
    roles.length ? `where people working in ${roles.join(", ")} would be useful career conversations` : "",
  ].filter(Boolean);
  return parts.join(". ").slice(0, 500);
}

export function buildHunterCompanyDiscoveryUrl(apiKey: string) {
  const url = new URL("https://api.hunter.io/v2/discover/people");
  url.searchParams.set("api_key", apiKey);
  return url;
}

function hunterSearchUrl(apiKey: string, requestedLimit: number, filters: Record<string, string | string[] | undefined>) {
  const url = new URL("https://api.hunter.io/v2/multi-domain-search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("limit", String(Math.min(100, Math.max(40, requestedLimit * 4))));
  for (const [key, rawValue] of Object.entries(filters)) {
    const value = Array.isArray(rawValue) ? unique(rawValue).join(",") : clean(rawValue);
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

export function buildHunterSearchAttempts(apiKey: string, goal: DiscoveryGoal, requestedLimit: number, companies: HunterCompany[] = []): HunterSearchAttempt[] {
  const companyNames = unique(companies
    .filter((company) => Number(company.emails_count?.personal || company.emails_count?.total || 0) > 0)
    .map((company) => clean(company.organization) || clean(company.domain)))
    .slice(0, 30);
  const departments = departmentsFor(goal);
  const seniorities = senioritiesFor(goal);
  const rawLocations = unique(goal.locations || []);
  const locationHints = unique(rawLocations.flatMap((location) => [countryHint(location), location])).slice(0, 6);
  const trustedEmailFilters = {
    type: "personal",
    required_field: "full_name,position",
    verification_status: "valid,accept_all",
    min_confidence: "50",
  };
  const attempts: HunterSearchAttempt[] = [];

  if (companyNames.length) {
    attempts.push({
      label: "company-role",
      url: hunterSearchUrl(apiKey, requestedLimit, {
        ...trustedEmailFilters,
        company_name: companyNames,
        department: departments,
        seniority: seniorities,
      }),
    });
    attempts.push({
      label: "company-seniority",
      url: hunterSearchUrl(apiKey, requestedLimit, {
        ...trustedEmailFilters,
        company_name: companyNames,
        seniority: seniorities,
      }),
    });
    attempts.push({
      label: "company-wide",
      url: hunterSearchUrl(apiKey, requestedLimit, {
        ...trustedEmailFilters,
        company_name: companyNames,
      }),
    });
  }

  if (locationHints.length) {
    attempts.push({
      label: "location-role",
      url: hunterSearchUrl(apiKey, requestedLimit, {
        ...trustedEmailFilters,
        location: locationHints,
        department: departments,
        seniority: seniorities,
      }),
    });
  }
  if (departments.length) {
    attempts.push({
      label: "role-wide",
      url: hunterSearchUrl(apiKey, requestedLimit, {
        ...trustedEmailFilters,
        department: departments,
        seniority: seniorities,
      }),
    });
  }
  attempts.push({
    label: "seniority-wide",
    url: hunterSearchUrl(apiKey, requestedLimit, {
      ...trustedEmailFilters,
      seniority: seniorities,
    }),
  });
  return attempts;
}

function stableExternalId(record: HunterMaskedPerson) {
  return [record.domain, record.name, record.position]
    .map((value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean)
    .join(":");
}

export function buildHunterSearchUrl(apiKey: string, goal: DiscoveryGoal, requestedLimit: number) {
  return buildHunterSearchAttempts(apiKey, goal, requestedLimit)[0].url;
}

export function hunterPersonRecord(record: HunterMaskedPerson): PdlPerson | null {
  const revealHandle = clean(record.reveal_handle);
  const name = clean(record.name);
  const position = clean(record.position);
  const domain = clean(record.domain).replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
  const company = titleCaseCompany(clean(record.company_name) || domain.split(".")[0]);
  const id = stableExternalId(record);
  if (!revealHandle || !id || !name || !position || !domain || !record.full_name_exists) return null;

  return {
    id,
    full_name: name,
    job_title: position,
    job_title_role: clean(record.department),
    job_title_levels: clean(record.seniority) ? [clean(record.seniority)] : [],
    job_company_name: company,
    job_company_website: domain,
    job_last_verified: record.verification?.date || null,
    experience: [{
      company: { name: company, website: domain },
      title: { name: position, role: clean(record.department), levels: clean(record.seniority) ? [clean(record.seniority)] : [] },
    }],
    reveal_handle: revealHandle,
    hunter_decision_maker: Boolean(record.decision_maker),
    hunter_full_name_exists: Boolean(record.full_name_exists),
    hunter_linkedin_exists: Boolean(record.linkedin_exists),
    hunter_verification: record.verification || null,
  };
}
