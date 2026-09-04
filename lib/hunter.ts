import type { DiscoveryGoal, PdlPerson } from "@/lib/discovery";

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

const DEPARTMENT_RULES: Array<[RegExp, string]> = [
  [/founder|chief|\bceo\b|\bcto\b|\bcfo\b|\bcoo\b|partner|president/i, "executive"],
  [/invest|venture|capital|bank|financ|account/i, "finance"],
  [/software|engineer|developer|technology|\bit\b|data|security/i, "it"],
  [/product/i, "product"],
  [/research|scientist/i, "research"],
  [/consult/i, "consulting"],
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

function stableExternalId(record: HunterMaskedPerson) {
  return [record.domain, record.name, record.position]
    .map((value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean)
    .join(":");
}

export function buildHunterSearchUrl(apiKey: string, goal: DiscoveryGoal, requestedLimit: number) {
  const url = new URL("https://api.hunter.io/v2/multi-domain-search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("type", "personal");
  url.searchParams.set("verification_status", "valid");
  url.searchParams.set("min_confidence", "70");
  url.searchParams.set("limit", String(Math.min(100, Math.max(40, requestedLimit * 4))));

  const industries = unique(goal.industries || []).slice(0, 5);
  const locations = unique(goal.locations || []).slice(0, 5);
  const departments = departmentsFor(goal);
  if (industries.length) url.searchParams.set("industry", industries.join(","));
  if (locations.length) url.searchParams.set("location", locations.join(","));
  if (departments.length) url.searchParams.set("department", departments.join(","));
  url.searchParams.set("seniority", senioritiesFor(goal).join(","));
  return url;
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
