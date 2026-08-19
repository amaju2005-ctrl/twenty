"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, ChevronRight, CircleDot, Clock3, Filter, Inbox, MessageCircleReply, Plus, Search, Send, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui";
import { getOutreachPerson, outreach } from "@/lib/data";

const tabs = ["All", "Draft", "Scheduled", "Sent", "Follow-up", "Replied"];

export default function OutreachPage() {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const items = useMemo(() => outreach.filter((item) => {
    const status = item.status === "follow_up" ? "Follow-up" : item.status[0].toUpperCase() + item.status.slice(1);
    const person = getOutreachPerson(item);
    return (tab === "All" || tab === status) && `${person.name} ${person.company} ${item.subject}`.toLowerCase().includes(query.toLowerCase());
  }), [tab, query]);

  return (
    <div className="page outreach-page">
      <header className="page-head"><div><span className="page-kicker">From first note to real conversation</span><h1>Outreach</h1><p>Track every thoughtful touch, reply and follow-up without turning people into a pipeline.</p></div><Link className="button button-dark" href="/people"><Plus size={15} /> Start a conversation</Link></header>

      <section className="outreach-stats">
        <div className="panel"><span className="stat-icon icon-sent"><Send size={17} /></span><div><small>Sent this month</small><strong>14</strong><span>of 20 focus limit</span></div></div>
        <div className="panel"><span className="stat-icon icon-reply"><MessageCircleReply size={17} /></span><div><small>Reply rate</small><strong>43%</strong><span className="positive">+8% vs last month</span></div></div>
        <div className="panel"><span className="stat-icon icon-call"><CalendarDays size={17} /></span><div><small>Conversations</small><strong>3</strong><span>2 upcoming</span></div></div>
        <div className="panel"><span className="stat-icon icon-time"><Clock3 size={17} /></span><div><small>Needs attention</small><strong>2</strong><span>Follow-ups ready</span></div></div>
      </section>

      <section className="panel outreach-workspace">
        <div className="outreach-toolbar"><div className="outreach-tabs">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}{item === "Follow-up" && <span>1</span>}</button>)}</div><div className="outreach-tools"><label><Search size={15} /><input placeholder="Search outreach" value={query} onChange={(e) => setQuery(e.target.value)} /></label><button aria-label="Filter"><Filter size={16} /></button></div></div>
        <div className="outreach-table-head"><span>Person</span><span>Message</span><span>Status</span><span>Next step</span><span>Updated</span><span /></div>
        <div className="outreach-list">{items.map((item) => { const person = getOutreachPerson(item); const status = item.status === "follow_up" ? "Follow-up" : item.status[0].toUpperCase() + item.status.slice(1); return <div className="outreach-row" key={item.id}><div className="outreach-person"><Avatar initials={person.initials} size="sm" /><span><strong>{person.name}</strong><small>{person.role} · {person.company}</small></span></div><div className="outreach-message"><strong>{item.subject}</strong><small>{item.sentAt ? `Sent ${item.sentAt}` : "Not sent yet"}</small></div><span className={`status-pill status-${item.status}`}>{status}</span><div className="outreach-next">{item.status === "replied" ? <CheckCircle2 size={14} /> : item.status === "follow_up" ? <Sparkles size={14} /> : item.status === "sent" ? <Clock3 size={14} /> : <CircleDot size={14} />}{item.nextStep}</div><span className="outreach-updated">{item.updatedAt}</span><Link href={`/compose/${person.id}`} aria-label={`Open message to ${person.name}`}><ChevronRight size={16} /></Link></div>; })}</div>
        {!items.length && <div className="empty-state"><Inbox size={26} /><h2>Nothing here yet</h2><p>Your {tab.toLowerCase()} messages will appear here.</p></div>}
      </section>

      <section className="outreach-note"><Sparkles size={18} /><div><strong>Quality over cadence</strong><p>Twenty will never auto-send a sequence. It suggests one follow-up when there is a useful reason to reconnect, then asks you to review it.</p></div><Link href="/settings?tab=trust">Review outreach principles <ArrowRight size={14} /></Link></section>
    </div>
  );
}
