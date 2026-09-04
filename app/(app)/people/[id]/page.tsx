import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bookmark, BriefcaseBusiness, Check, ExternalLink, GraduationCap, Lightbulb, Link as LinkIcon, LockKeyhole, Mail, MapPin, Network, Sparkles } from "lucide-react";
import { Avatar, Score } from "@/components/ui";
import { ContactLookup } from "@/components/contact-lookup";
import { getPersonForCurrentUser } from "@/lib/people-server";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getPersonForCurrentUser(id);
  if (!person) notFound();
  return (
    <div className="page person-detail-page">
      <Link href="/people" className="back-link"><ArrowLeft size={15} /> Back to shortlist</Link>
      <section className="profile-hero panel">
        <div className="profile-main"><Avatar initials={person.initials} size="xl" /><div><div className="profile-title"><h1>{person.name}</h1><span className="response-chip">{person.responseLikelihood} reply fit</span></div><p>{person.role} at <strong>{person.company}</strong></p><span><MapPin size={13} /> {person.location}</span></div></div>
        <div className="profile-score"><Score value={person.score} /><span><strong>Relevance</strong><small>Excellent match</small></span></div>
        <div className="profile-actions"><button className="icon-button" aria-label="Save person"><Bookmark size={17} /></button>{person.social?.linkedin && <a className="button button-ghost" href={person.social.linkedin} target="_blank" rel="noreferrer"><LinkIcon size={15} /> Profile</a>}<Link className="button button-dark" href={`/compose/${person.id}`}><Mail size={15} /> Draft outreach</Link></div>
      </section>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel why-panel"><div className="panel-head"><div><h2>Why {person.name.split(" ")[0]} belongs on your shortlist</h2><p>The evidence behind the score</p></div><Sparkles size={18} /></div><div className="why-content"><p className="why-summary">{person.rationale}</p><div className="signal-grid">{person.signals.map((signal, index) => <div key={signal}><span>{[<Network key="n" />, <BriefcaseBusiness key="b" />, <GraduationCap key="g" />, <Lightbulb key="l" />][index % 4]}</span><div><strong>{signal}</strong><small>{index === 0 ? "A concrete opening for your note" : index === 1 ? "Directly supports your target move" : index === 2 ? "Makes the conversation more credible" : "Increases the chance of useful advice"}</small></div><Check size={14} /></div>)}</div></div></section>

          <section className="panel experience-panel"><div className="panel-head"><h2>Career path</h2><span>Source: {person.dataSource || "professional profile data"}</span></div><div className="timeline">{person.experience.map((item, index) => <div key={`${item.company}-${item.role}`}><span className="timeline-dot" /><div><strong>{item.role}</strong><p>{item.company}</p><small>{item.period}</small></div>{index === 0 && <span className="current-chip">Current</span>}</div>)}{person.education[0] ? <div><span className="timeline-dot education-dot" /><div><strong>{person.education[0]}</strong><p>Education</p></div></div> : null}</div></section>

          <section className="panel conversation-panel"><div className="panel-head"><div><h2>Good conversation angles</h2><p>Specific questions grounded in both profiles</p></div></div><div className="angle-list"><div><span>01</span><p>What surprised you most about moving from {person.experience[1]?.company || "your previous role"} into {person.company}?</p><button>Use this angle <ArrowRight size={13} /></button></div><div><span>02</span><p>Which parts of a strategy background are genuinely useful in early-stage climate work—and which need unlearning?</p><button>Use this angle <ArrowRight size={13} /></button></div><div><span>03</span><p>If you were making the same transition today, which teams or problem spaces would you pay attention to?</p><button>Use this angle <ArrowRight size={13} /></button></div></div></section>
        </div>

        <aside className="detail-aside">
          <ContactLookup personId={person.id} initialContact={person.contact} liveData={person.dataSource === "People Data Labs"} />
          <section className="panel trust-tip"><LockKeyhole size={17} /><div><strong>Trust check</strong><p>Would this message still feel fair if the recipient knew exactly how you found them? Twenty only recommends routes where the answer is yes.</p></div></section>
          {person.lastActive && <section className="panel timely-panel"><span className="page-kicker">Timely signal</span><h3>{person.lastActive}</h3><p>A useful reference if it is genuinely relevant to your question.</p><a href="#">View source <ExternalLink size={12} /></a></section>}
        </aside>
      </div>
    </div>
  );
}
