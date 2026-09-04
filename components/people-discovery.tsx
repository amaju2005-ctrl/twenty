"use client";

import { useMemo, useState } from "react";
import { Filter, Grid2X2, List, LoaderCircle, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
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

  return (
    <div className="page people-page">
      <header className="page-head">
        <div><span className="page-kicker">Your relationship map</span><h1>People worth knowing</h1><p>Twenty ranks the people with the strongest reason to speak to you next.</p></div>
        <div className="page-head-actions">
          <button className="button button-ghost" onClick={() => setShowFilters((current) => !current)}><SlidersHorizontal size={15} /> Refine</button>
          <button className="button button-dark" onClick={runDiscovery} disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />} {busy ? "Finding your twenty…" : people.length ? "Refresh my twenty" : "Find my twenty"}</button>
        </div>
      </header>

      <div className={`discovery-context discovery-${mode}`} aria-live="polite">
        <Sparkles size={16} />
        <div><strong>{mode === "live" ? "Live professional data" : "Demo data"}</strong><p>{mode === "live" ? "Profiles are sourced through the configured provider, scored against your career focus and stored privately in Supabase." : "Explore the workflow now. Add the provider keys in Vercel to replace these examples with real people."}</p></div>
      </div>

      {error ? <div className="discovery-error" role="alert">{error}</div> : null}

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
