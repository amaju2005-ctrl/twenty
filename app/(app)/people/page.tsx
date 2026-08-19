"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Filter, Grid2X2, List, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { PersonCard } from "@/components/person-card";
import { people } from "@/lib/data";

const filterGroups = ["All", "Warm paths", "Climate VC", "Operators", "Founders"];

export default function PeoplePage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [minScore, setMinScore] = useState(70);
  const [grid, setGrid] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => people.filter((person) => {
    const matchesQuery = `${person.name} ${person.role} ${person.company} ${person.signals.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    const matchesScore = person.score >= minScore;
    const matchesFilter = filter === "All" || (filter === "Warm paths" && (person.tags.includes("Warm path") || person.tags.includes("Warm intro"))) || person.tags.some((tag) => tag.toLowerCase().includes(filter.replace("Climate ", "").toLowerCase())) || person.role.toLowerCase().includes(filter.replace(/s$/, "").toLowerCase());
    return matchesQuery && matchesScore && matchesFilter;
  }), [query, filter, minScore]);

  return (
    <div className="page people-page">
      <header className="page-head">
        <div><span className="page-kicker">Your relationship map</span><h1>People worth knowing</h1><p>Not everyone who matches a keyword belongs on your shortlist. These people have a reason to talk.</p></div>
        <button className="button button-dark" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15} /> Refine discovery</button>
      </header>

      <div className="discovery-context"><Sparkles size={16} /><div><strong>How this list was built</strong><p>We balanced career-path similarity, climate relevance, seniority, timing, warm routes and likely conversation value.</p></div><button>Why these signals?</button></div>

      <section className="discovery-toolbar panel">
        <label className="people-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, companies or shared signals" />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}</label>
        <div className="filter-tabs">{filterGroups.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <div className="view-controls"><button aria-label="Sort"><ArrowDownUp size={16} /></button><span /><button className={grid ? "active" : ""} onClick={() => setGrid(true)} aria-label="Grid view"><Grid2X2 size={16} /></button><button className={!grid ? "active" : ""} onClick={() => setGrid(false)} aria-label="List view"><List size={17} /></button></div>
      </section>

      {showFilters && <section className="filter-drawer panel"><div><label>Minimum relevance <strong>{minScore}</strong></label><input type="range" min="50" max="95" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} /></div><div><label>Location</label><select><option>United Kingdom</option><option>Europe</option><option>Anywhere</option></select></div><div><label>Seniority</label><select><option>Any level</option><option>Peer</option><option>Manager</option><option>Executive</option></select></div><div><label>Contact route</label><select><option>Any trusted route</option><option>Verified email</option><option>Warm introduction</option></select></div></section>}

      <div className="results-meta"><span><strong>{filtered.length}</strong> people · sorted by relevance</span><span><Filter size={13} /> Quality threshold {minScore}+</span></div>
      <section className={grid ? "people-grid" : "people-list"}>{filtered.map((person) => <PersonCard person={person} rank={people.indexOf(person) + 1} key={person.id} />)}</section>
      {!filtered.length && <div className="empty-state"><Search size={26} /><h2>No strong matches yet</h2><p>Try lowering the relevance threshold or broadening the search.</p><button className="button button-ghost" onClick={() => { setQuery(""); setFilter("All"); setMinScore(70); }}>Reset filters</button></div>}
    </div>
  );
}
