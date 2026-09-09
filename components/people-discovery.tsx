"use client";

import { useMemo, useState } from "react";
import { ContactRound, ExternalLink, Filter, Grid2X2, List, LoaderCircle, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { PersonCard } from "@/components/person-card";
import type { PeopleMode } from "@/lib/people-server";
import type { Person } from "@/lib/types";

const filterGroups = ["All", "High fit", "Verified email", "Email not checked"] as const;

type DiscoveryResponse = {
  mode?: PeopleMode;
  people?: Person[];
  error?: string;
  message?: string;
};

type LinkedInImportResponse = {
  people?: Person[];
  importedCount?: number;
  skipped?: Array<{ url: string; reason: string }>;
  error?: string;
};

export function PeopleDiscovery({ initialPeople, initialMode }: { initialPeople: Person[]; initialMode: PeopleMode }) {
  const [people, setPeople] = useState(initialPeople);
  const [mode, setMode] = useState(initialMode);
  const [query, setQuery] = useState("");
  const [discoveryFocus, setDiscoveryFocus] = useState("");
  const [discoveryLocation, setDiscoveryLocation] = useState("");
  const [filter, setFilter] = useState<(typeof filterGroups)[number]>("All");
  const [minScore, setMinScore] = useState(60);
  const [grid, setGrid] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [linkedInUrls, setLinkedInUrls] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => people.filter((person) => {
    const matchesQuery = `${person.name} ${person.role} ${person.company} ${person.signals.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    const matchesScore = person.score >= minScore;
    const matchesFilter = filter === "All"
      || (filter === "High fit" && person.score >= 85)
      || (filter === "Verified email" && person.contact.status === "verified")
      || (filter === "Email not checked" && person.contact.status === "not_sought");
    return matchesQuery && matchesScore && matchesFilter;
  }), [filter, minScore, people, query]);

  async function runDiscovery() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: discoveryFocus.trim() || undefined,
          location: discoveryLocation.trim() || undefined,
          limit: 20,
        }),
      });
      const result = await response.json().catch(() => ({})) as DiscoveryResponse;
      if (!response.ok) throw new Error(result.error || "Discovery could not be completed.");
      setPeople(result.people || []);
      setMode(result.mode || "live");
      if (result.message) setError(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Discovery could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function importFromLinkedIn() {
    if (!linkedInUrls.trim()) {
      setError("Paste at least one LinkedIn profile URL first.");
      return;
    }
    setImportBusy(true);
    setError("");
    setImportMessage("");
    try {
      const response = await fetch("/api/linkedin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: linkedInUrls }),
      });
      const result = await response.json().catch(() => ({})) as LinkedInImportResponse;
      if (!response.ok) throw new Error(result.error || "LinkedIn profiles could not be imported.");
      const imported = result.people || [];
      setPeople((current) => {
        const merged = new Map(current.map((person) => [person.id, person]));
        for (const person of imported) merged.set(person.id, person);
        return [...merged.values()].sort((left, right) => right.score - left.score);
      });
      setMode("live");
      setLinkedInUrls("");
      const skippedCount = result.skipped?.length || 0;
      setImportMessage(`${result.importedCount || imported.length} profile${imported.length === 1 ? "" : "s"} added to your shortlist${skippedCount ? ` · ${skippedCount} could not be resolved` : ""}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "LinkedIn profiles could not be imported.");
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div className="page people-page">
      <header className="page-head">
        <div><span className="page-kicker">Your relationship map</span><h1>People worth knowing</h1><p>Twenty ranks the people with the strongest reason to speak to you next.</p></div>
        <div className="page-head-actions">
          <button className="button button-ghost" onClick={() => setShowFilters((current) => !current)}><SlidersHorizontal size={15} /> Refine</button>
          <button className="button button-ghost" onClick={() => setShowLinkedIn((current) => !current)}><ContactRound size={15} /> Add from LinkedIn</button>
          <button className="button button-dark" onClick={runDiscovery} disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />} {busy ? "Finding your twenty…" : people.length ? "Refresh my twenty" : "Find my twenty"}</button>
        </div>
      </header>

      <div className={`discovery-context discovery-${mode}`} aria-live="polite">
        <Sparkles size={16} />
        <div><strong>{mode === "live" ? "Live professional data" : "Demo data"}</strong><p>{mode === "live" ? "Profiles are sourced through the configured provider, scored against your career focus and stored privately in Supabase." : "Explore the workflow now. Add the provider keys in Vercel to replace these examples with real people."}</p></div>
      </div>

      {error ? <div className="discovery-error" role="alert">{error}</div> : null}
      {importMessage ? <div className="discovery-success" role="status">{importMessage}</div> : null}

      {showLinkedIn ? <section className="linkedin-import panel">
        <div className="linkedin-import-copy">
          <span className="page-kicker">LinkedIn scout</span>
          <h2>Bring the people you already care about</h2>
          <p>Search LinkedIn yourself, then paste up to five public profile URLs. Twenty sends only those handles to Hunter for professional matching—it does not scrape LinkedIn.</p>
          <p className="linkedin-credit-note">A successful email match uses one Hunter search credit. No result means no credit used.</p>
          <a className="button button-ghost linkedin-search-link" href="https://www.linkedin.com/search/results/people/" target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open LinkedIn people search</a>
        </div>
        <div className="linkedin-import-form">
          <label htmlFor="linkedin-profile-urls">LinkedIn profile URLs</label>
          <textarea id="linkedin-profile-urls" value={linkedInUrls} onChange={(event) => setLinkedInUrls(event.target.value)} placeholder={"https://www.linkedin.com/in/example-one\nhttps://www.linkedin.com/in/example-two"} rows={4} />
          <button className="button button-dark" onClick={importFromLinkedIn} disabled={importBusy}>{importBusy ? <LoaderCircle className="spin" size={15} /> : <ContactRound size={15} />} {importBusy ? "Resolving profiles…" : "Add to my shortlist"}</button>
        </div>
      </section> : null}

      <section className="discovery-toolbar panel">
        <label className="people-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter your shortlist" />{query ? <button onClick={() => setQuery("")} aria-label="Clear shortlist filter"><X size={14} /></button> : null}</label>
        <div className="filter-tabs">{filterGroups.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <div className="view-controls"><button className={grid ? "active" : ""} onClick={() => setGrid(true)} aria-label="Grid view"><Grid2X2 size={16} /></button><button className={!grid ? "active" : ""} onClick={() => setGrid(false)} aria-label="List view"><List size={17} /></button></div>
      </section>

      {showFilters ? <section className="filter-drawer panel">
        <div><label>Minimum relevance <strong>{minScore}</strong></label><input type="range" min="40" max="95" value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} /></div>
        <div className="discovery-field"><label htmlFor="discovery-focus">Discovery focus</label><input id="discovery-focus" value={discoveryFocus} onChange={(event) => setDiscoveryFocus(event.target.value)} placeholder="Optional target override" /></div>
        <div className="discovery-field"><label htmlFor="discovery-location">Location</label><input id="discovery-location" value={discoveryLocation} onChange={(event) => setDiscoveryLocation(event.target.value)} placeholder="e.g. London, UK" /></div>
        <div className="discovery-field"><label>Contact policy</label><span>Professional email only · reveal individually</span></div>
      </section> : null}

      <div className="results-meta"><span><strong>{filtered.length}</strong> people · sorted by relevance</span><span><Filter size={13} /> Quality threshold {minScore}+</span></div>
      <section className={grid ? "people-grid" : "people-list"}>{filtered.map((person, index) => <PersonCard person={person} rank={index + 1} key={person.id} />)}</section>
      {!filtered.length ? <div className="empty-state"><Search size={26} /><h2>{people.length ? "No people match these filters" : "Your live shortlist is ready to be built"}</h2><p>{people.length ? "Lower the relevance threshold or clear the shortlist filter." : "Run discovery to find and rank up to twenty relevant professionals."}</p>{people.length ? <button className="button button-ghost" onClick={() => { setQuery(""); setFilter("All"); setMinScore(60); }}>Reset filters</button> : <button className="button button-dark" onClick={runDiscovery} disabled={busy}>{busy ? "Searching…" : "Find my twenty"}</button>}</div> : null}
    </div>
  );
}
