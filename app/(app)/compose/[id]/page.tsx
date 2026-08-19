"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Check, ChevronDown, Clock3, Copy, Info, LoaderCircle, MailCheck, RotateCcw, Send, ShieldCheck, WandSparkles, X } from "lucide-react";
import { Avatar, ContactBadge, ProgressBar } from "@/components/ui";
import { demoUser, getPerson } from "@/lib/data";

function defaultDraft(name: string, company: string, role: string, signal: string) {
  const first = name.split(" ")[0];
  return `Hi ${first},\n\nI came across your path while looking into people who have made thoughtful moves into climate work. Your ${signal.toLowerCase()} stood out—especially your role at ${company}.\n\nI’m currently in strategy and exploring an early-stage climate operator move. I’d be curious: what did you find most different about doing strategy in a smaller, mission-led team?\n\nIf you had 15 minutes for a quick call, I’d really value your perspective. No worries at all if timing is tight.\n\nBest,\n${demoUser.firstName}`;
}

export default function ComposePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const person = getPerson(id);
  const [subject, setSubject] = useState(person ? `${person.relationship}: a quick question` : "A quick career question");
  const [body, setBody] = useState(person ? defaultDraft(person.name, person.company, person.role, person.signals[0]) : "");
  const [tone, setTone] = useState("Warm & direct");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  if (!person) return <div className="page"><h1>Person not found</h1></div>;

  const recipient = person;
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const score = Math.max(55, Math.min(98, 100 - Math.max(0, wordCount - 125) / 2));

  async function redraft() {
    setBusy(true);
    try {
      const response = await fetch("/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ person, profile: demoUser, tone, intent: "Ask for perspective on moving into climate operations" }) });
      if (response.ok) {
        const result = await response.json();
        setSubject(result.subject);
        setBody(result.body);
      }
    } finally { setBusy(false); }
  }

  async function sendEmail() {
    setBusy(true);
    const response = await fetch("/api/gmail/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: recipient.contact.email, subject, body, personId: recipient.id }) });
    setBusy(false);
    if (response.ok) setSent(true);
  }

  return (
    <div className="page compose-page">
      {sent && <div className="sent-overlay"><div className="sent-card"><button onClick={() => setSent(false)} aria-label="Close"><X size={18} /></button><span className="sent-icon"><MailCheck size={25} /></span><span className="page-kicker">Message queued</span><h2>Your note to {person.name.split(" ")[0]} is ready.</h2><p>Demo mode recorded this as sent. With Gmail connected, it sends from your own inbox and replies sync back here.</p><div><Link className="button button-dark" href="/outreach">View outreach</Link><button className="button button-ghost" onClick={() => router.push("/people")}>Find the next person</button></div></div></div>}
      <header className="compose-head"><Link href={`/people/${person.id}`}><ArrowLeft size={15} /> Back to profile</Link><div><span className="autosave"><Check size={12} /> Saved just now</span><button className="button button-ghost" onClick={() => setShowSchedule(!showSchedule)}><CalendarClock size={15} /> Schedule <ChevronDown size={13} /></button><button className="button button-dark" onClick={sendEmail} disabled={busy || !person.contact.email}>{busy ? <LoaderCircle className="spin" size={16} /> : <Send size={15} />} Send with Gmail</button></div>{showSchedule && <div className="schedule-popover"><strong>Choose a considered time</strong><button>Tomorrow · 08:45 <span>Recommended</span></button><button>Friday · 09:15</button><button>Pick date & time</button></div>}</header>

      <div className="compose-layout">
        <aside className="compose-context">
          <span className="page-kicker">Writing to</span><div className="compose-person"><Avatar initials={person.initials} size="lg" /><div><strong>{person.name}</strong><span>{person.role}</span><small>{person.company}</small></div></div><ContactBadge status={person.contact.status} />
          <div className="context-divider" />
          <span className="page-kicker">Why now</span><p>{person.rationale}</p>
          <div className="context-divider" />
          <span className="page-kicker">Shared signals</span><div className="compose-signals">{person.signals.map((signal) => <span key={signal}><Check size={11} /> {signal}</span>)}</div>
          <div className="recipient-preview"><ShieldCheck size={15} /><p><strong>Recipient view</strong>This note uses professional context only and makes one clear, low-pressure ask.</p></div>
        </aside>

        <main className="composer panel">
          <div className="composer-toolbar"><div><button onClick={redraft} disabled={busy}><WandSparkles size={15} /> Redraft {busy && <LoaderCircle size={13} className="spin" />}</button><button onClick={() => setBody(defaultDraft(person.name, person.company, person.role, person.signals[0]))}><RotateCcw size={14} /> Reset</button></div><label>Tone<select value={tone} onChange={(e) => setTone(e.target.value)}><option>Warm & direct</option><option>Concise</option><option>Curious</option><option>Peer-to-peer</option></select></label></div>
          <div className="email-fields"><label><span>From</span><div>{demoUser.name} &lt;{demoUser.email}&gt;</div></label><label><span>To</span><div>{person.contact.email || "Choose a trusted contact route"}</div></label><label><span>Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} /></label></div>
          <textarea className="email-body" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Email body" />
          <div className="composer-footer"><span>{wordCount} words · about {Math.max(1, Math.ceil(wordCount / 200))} min read</span><button><Copy size={13} /> Copy</button></div>
        </main>

        <aside className="quality-panel">
          <div className="quality-score"><div><span className="page-kicker">Message quality</span><strong>{Math.round(score)}</strong></div><ProgressBar value={score} /><p>Strong: specific, short and easy to answer.</p></div>
          <div className="quality-checks"><div className="pass"><Check size={14} /><span><strong>Specific opening</strong>Based on a real shared signal</span></div><div className="pass"><Check size={14} /><span><strong>One clear question</strong>Easy to answer in a few sentences</span></div><div className="pass"><Check size={14} /><span><strong>Respectful ask</strong>Includes a genuine opt-out</span></div><div className={wordCount <= 125 ? "pass" : "warn"}>{wordCount <= 125 ? <Check size={14} /> : <Info size={14} />}<span><strong>Under 125 words</strong>{wordCount <= 125 ? "Focused and readable" : "Consider trimming the draft"}</span></div></div>
          <div className="send-control"><Clock3 size={15} /><div><strong>Thoughtful pace</strong><p>You have sent 2 messages today. Your daily focus limit is 5.</p><ProgressBar value={40} /></div></div>
        </aside>
      </div>
    </div>
  );
}
