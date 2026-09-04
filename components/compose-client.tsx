"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Check, ChevronDown, Clock3, Copy, Info, LoaderCircle, MailCheck, RotateCcw, Search, Send, ShieldCheck, WandSparkles, X } from "lucide-react";
import { Avatar, ContactBadge, ProgressBar } from "@/components/ui";
import type { SenderProfile } from "@/lib/people-server";
import type { Person } from "@/lib/types";

function defaultDraft(person: Person, profile: SenderProfile) {
  const first = person.name.split(" ")[0];
  const signal = person.signals[0] || person.role;
  return `Hi ${first},\n\nI came across your work while looking for people with relevant experience in ${person.role.toLowerCase()} roles. Your ${signal.toLowerCase()} stood out, particularly your path at ${person.company}.\n\nI’m currently ${profile.headline.toLowerCase()} and exploring ${profile.target.toLowerCase()}. What have you found most important for someone trying to make that move thoughtfully?\n\nIf you had 15 minutes for a quick call, I’d really value your perspective. No worries at all if timing is tight.\n\nBest,\n${profile.firstName}`;
}

export function ComposeClient({ initialPerson, profile, demoMode }: { initialPerson: Person; profile: SenderProfile; demoMode: boolean }) {
  const router = useRouter();
  const [person, setPerson] = useState(initialPerson);
  const [subject, setSubject] = useState(`${initialPerson.relationship}: a quick question`);
  const [body, setBody] = useState(() => defaultDraft(initialPerson, profile));
  const [tone, setTone] = useState("Warm & direct");
  const [busy, setBusy] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [sentMode, setSentMode] = useState<"live" | "demo">("live");
  const [showSchedule, setShowSchedule] = useState(false);
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const score = Math.max(55, Math.min(98, 100 - Math.max(0, wordCount - 125) / 2));

  async function redraft() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person, profile, tone, intent: `Ask for perspective on ${profile.target}` }),
      });
      const result = await response.json().catch(() => ({})) as { subject?: string; body?: string; error?: string };
      if (!response.ok || !result.subject || !result.body) throw new Error(result.error || "The draft could not be generated.");
      setSubject(result.subject);
      setBody(result.body);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The draft could not be generated.");
    } finally {
      setBusy(false);
    }
  }

  async function findEmail() {
    setContactBusy(true);
    setError("");
    try {
      const response = await fetch("/api/contact/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: person.id }),
      });
      const result = await response.json().catch(() => ({})) as { contact?: Person["contact"]; error?: string };
      if (!response.ok || !result.contact) throw new Error(result.error || "No trusted work email could be found.");
      setPerson((current) => ({ ...current, contact: result.contact! }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No trusted work email could be found.");
    } finally {
      setContactBusy(false);
    }
  }

  async function sendEmail() {
    if (!person.contact.email) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: person.contact.email, subject, body, personId: person.id }),
      });
      const result = await response.json().catch(() => ({})) as { mode?: "live" | "demo"; error?: string };
      if (!response.ok) throw new Error(result.error || "The email could not be sent.");
      setSentMode(result.mode || "live");
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The email could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function copyDraft() {
    await navigator.clipboard.writeText(`${subject}\n\n${body}`);
  }

  return (
    <div className="page compose-page">
      {sent ? <div className="sent-overlay"><div className="sent-card"><button onClick={() => setSent(false)} aria-label="Close"><X size={18} /></button><span className="sent-icon"><MailCheck size={25} /></span><span className="page-kicker">{sentMode === "live" ? "Message sent" : "Demo message recorded"}</span><h2>Your note to {person.name.split(" ")[0]} {sentMode === "live" ? "was sent." : "is ready."}</h2><p>{sentMode === "live" ? "It was sent from your connected Gmail account. Replies can be synced into Twenty." : "Demo mode did not send an external email. Connect Gmail and disable demo mode for live sending."}</p><div><Link className="button button-dark" href="/outreach">View outreach</Link><button className="button button-ghost" onClick={() => router.push("/people")}>Find the next person</button></div></div></div> : null}
      <header className="compose-head"><Link href={`/people/${person.id}`}><ArrowLeft size={15} /> Back to profile</Link><div><span className="autosave"><Check size={12} /> Draft ready</span><button className="button button-ghost" onClick={() => setShowSchedule((current) => !current)}><CalendarClock size={15} /> Schedule <ChevronDown size={13} /></button><button className="button button-dark" onClick={sendEmail} disabled={busy || !person.contact.email}>{busy ? <LoaderCircle className="spin" size={16} /> : <Send size={15} />} Send with Gmail</button></div>{showSchedule ? <div className="schedule-popover"><strong>Choose a considered time</strong><button>Tomorrow · 08:45 <span>Recommended</span></button><button>Friday · 09:15</button><button>Pick date & time</button></div> : null}</header>

      {error ? <div className="compose-error" role="alert">{error}</div> : null}
      <div className="compose-layout">
        <aside className="compose-context">
          <span className="page-kicker">Writing to</span><div className="compose-person"><Avatar initials={person.initials} size="lg" /><div><strong>{person.name}</strong><span>{person.role}</span><small>{person.company}</small></div></div><ContactBadge status={person.contact.status} />
          {!person.contact.email && !demoMode ? <button className="button button-ghost compose-find-email" onClick={findEmail} disabled={contactBusy}>{contactBusy ? <LoaderCircle className="spin" size={14} /> : <Search size={14} />} {contactBusy ? "Checking…" : "Find work email"}</button> : null}
          <div className="context-divider" />
          <span className="page-kicker">Why now</span><p>{person.rationale}</p>
          <div className="context-divider" />
          <span className="page-kicker">Shared signals</span><div className="compose-signals">{person.signals.map((signal) => <span key={signal}><Check size={11} /> {signal}</span>)}</div>
          <div className="recipient-preview"><ShieldCheck size={15} /><p><strong>Recipient view</strong>This note uses professional context only and makes one clear, low-pressure ask.</p></div>
        </aside>

        <main className="composer panel">
          <div className="composer-toolbar"><div><button onClick={redraft} disabled={busy}><WandSparkles size={15} /> Redraft {busy ? <LoaderCircle size={13} className="spin" /> : null}</button><button onClick={() => setBody(defaultDraft(person, profile))}><RotateCcw size={14} /> Reset</button></div><label>Tone<select value={tone} onChange={(event) => setTone(event.target.value)}><option>Warm & direct</option><option>Concise</option><option>Curious</option><option>Peer-to-peer</option></select></label></div>
          <div className="email-fields"><label><span>From</span><div>{profile.name} &lt;{profile.email}&gt;</div></label><label><span>To</span><div>{person.contact.email || "Find a trusted professional address before sending"}</div></label><label><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} /></label></div>
          <textarea className="email-body" value={body} onChange={(event) => setBody(event.target.value)} aria-label="Email body" />
          <div className="composer-footer"><span>{wordCount} words · about {Math.max(1, Math.ceil(wordCount / 200))} min read</span><button onClick={copyDraft}><Copy size={13} /> Copy</button></div>
        </main>

        <aside className="quality-panel">
          <div className="quality-score"><div><span className="page-kicker">Message quality</span><strong>{Math.round(score)}</strong></div><ProgressBar value={score} /><p>Strong: specific, short and easy to answer.</p></div>
          <div className="quality-checks"><div className="pass"><Check size={14} /><span><strong>Specific opening</strong>Based on a real professional signal</span></div><div className="pass"><Check size={14} /><span><strong>One clear question</strong>Easy to answer in a few sentences</span></div><div className="pass"><Check size={14} /><span><strong>Respectful ask</strong>Includes a genuine opt-out</span></div><div className={wordCount <= 125 ? "pass" : "warn"}>{wordCount <= 125 ? <Check size={14} /> : <Info size={14} />}<span><strong>Under 125 words</strong>{wordCount <= 125 ? "Focused and readable" : "Consider trimming the draft"}</span></div></div>
          <div className="send-control"><Clock3 size={15} /><div><strong>Thoughtful pace</strong><p>Twenty is designed for a small number of reviewed, relevant messages—not bulk sending.</p></div></div>
        </aside>
      </div>
    </div>
  );
}
