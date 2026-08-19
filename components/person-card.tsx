import Link from "next/link";
import { ArrowUpRight, Bookmark, Mail } from "lucide-react";
import type { Person } from "@/lib/types";
import { Avatar, ContactBadge, Score } from "@/components/ui";

export function PersonCard({ person, rank }: { person: Person; rank?: number }) {
  return (
    <article className="person-card">
      <div className="person-card-top">
        {rank ? <span className="rank">{String(rank).padStart(2, "0")}</span> : null}
        <Avatar initials={person.initials} size="lg" />
        <div className="person-identity">
          <div><Link href={`/people/${person.id}`}>{person.name}</Link><span className="response-chip">{person.responseLikelihood} reply fit</span></div>
          <p>{person.role} <span>at</span> {person.company}</p>
          <small>{person.location}</small>
        </div>
        <Score value={person.score} />
      </div>
      <div className="person-reason">
        <span>Why this person</span>
        <p>{person.rationale}</p>
      </div>
      <div className="signal-row">
        {person.signals.slice(0, 4).map((signal) => <span key={signal}>{signal}</span>)}
      </div>
      <div className="person-card-foot">
        <ContactBadge status={person.contact.status} />
        <div className="card-actions">
          <button className="icon-button" aria-label={`Save ${person.name}`}><Bookmark size={17} /></button>
          <Link className="button button-ghost button-small" href={`/people/${person.id}`}>View <ArrowUpRight size={15} /></Link>
          <Link className="button button-dark button-small" href={`/compose/${person.id}`}><Mail size={15} /> Draft</Link>
        </div>
      </div>
    </article>
  );
}
