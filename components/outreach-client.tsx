"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, ChevronRight, CircleDot, Clock3, Inbox, MessageCircleReply, Plus, Search, Send, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { OutreachViewItem } from "@/lib/outreach-server";

const tabs = ["All", "Draft", "Scheduled", "Sent", "Follow-up", "Replied"] as const;

function statusLabel(status: OutreachViewItem["status"]) {
  return status === "follow_up" ? "Follow-up" : `${status[0].toUpperCase()}${status.slice(1)}`;
}

export function OutreachClient({ initialItems, mode, currentMonth, loadError = "" }: { initialItems: OutreachViewItem[]; mode: "live" | "demo"; currentMonth: string; loadError?: string }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [query, setQuery] = useState("");
  const items = useMemo(() => initialItems.filter((item) => {
    const matchesTab = tab === "All" || tab === statusLabel(item.status);
    const searchable = `${item.person.name} ${item.person.company} ${item.subject}`.toLowerCase();
    return matchesTab && searchable.includes(query.toLowerCase());
  }), [initialItems, query, tab]);

  const delivered = initialItems.filter((item) => ["sent", "follow_up", "replied"].includes(item.status));
  const sentThisMonth = delivered.filter((item) => {
    if (!item.sentAtIso) return mode === "demo";
    return item.sentAtIso.slice(0, 7) === currentMonth;
  }).length;
  const replies = initialItems.filter((item) => item.status === "replied").length;
  const attention = initialItems.filter((item) => item.status === "follow_up").length;
  const replyRate = delivered.length ? Math.round((replies / delivered.length) * 100) : 0;

  return (
    <div className="page outreach-page">
      <header className="page-head"><div><span className="page-kicker">From first note to real conversation</span><h1>Outreach</h1><p>Track every thoughtful touch, reply and follow-up without turning people into a pipeline.</p></div><Link className="button button-dark" href="/people"><Plus size={15} /> Start a conversation</Link></header>

      {mode === "demo" ? <div className="discovery-context discovery-demo"><Sparkles size={16} /><div><strong>Demo outreach</strong><p>These examples are shown only while demo mode is enabled.</p></div></div> : null}
      {loadError ? <div className="discovery-error" role="alert">{loadError}</div> : null}

      <section className="outreach-stats">
        <div className="panel"><span className="stat-icon icon-sent"><Send size={17} /></span><div><small>Sent this month</small><strong>{sentThisMonth}</strong><span>thoughtful messages</span></div></div>
        <div className="panel"><span className="stat-icon icon-reply"><MessageCircleReply size={17} /></span><div><small>Reply rate</small><strong>{replyRate}%</strong><span>{replies} {replies === 1 ? "reply" : "replies"}</span></div></div>
        <div className="panel"><span className="stat-icon icon-call"><CalendarDays size={17} /></span><div><small>Conversations</small><strong>{replies}</strong><span>reply threads</span></div></div>
        <div className="panel"><span className="stat-icon icon-time"><Clock3 size={17} /></span><div><small>Needs attention</small><strong>{attention}</strong><span>{attention === 1 ? "follow-up" : "follow-ups"} ready</span></div></div>
      </section>

      <section className="panel outreach-workspace">
        <div className="outreach-toolbar"><div className="outreach-tabs">{tabs.map((item) => { const count = item === "Follow-up" ? attention : 0; return <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}{count ? <span>{count}</span> : null}</button>; })}</div><div className="outreach-tools"><label><Search size={15} /><input aria-label="Search outreach" placeholder="Search outreach" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div></div>
        <div className="outreach-table-head"><span>Person</span><span>Message</span><span>Status</span><span>Next step</span><span>Updated</span><span /></div>
        <div className="outreach-list">{items.map((item) => <div className="outreach-row" key={item.id}><div className="outreach-person"><Avatar initials={item.person.initials} size="sm" /><span><strong>{item.person.name}</strong><small>{item.person.role}{item.person.company ? ` · ${item.person.company}` : ""}</small></span></div><div className="outreach-message"><strong>{item.subject}</strong><small>{item.sentAt ? `Sent ${item.sentAt}` : "Not sent yet"}</small></div><span className={`status-pill status-${item.status}`}>{statusLabel(item.status)}</span><div className="outreach-next">{item.status === "replied" ? <CheckCircle2 size={14} /> : item.status === "follow_up" ? <Sparkles size={14} /> : item.status === "sent" ? <Clock3 size={14} /> : <CircleDot size={14} />}{item.nextStep}</div><span className="outreach-updated">{item.updatedAt}</span>{item.personId ? <Link href={`/compose/${item.personId}`} aria-label={`Open message to ${item.person.name}`}><ChevronRight size={16} /></Link> : <span />}</div>)}</div>
        {!items.length ? <div className="empty-state"><Inbox size={26} /><h2>{initialItems.length ? "Nothing matches this view" : "No outreach yet"}</h2><p>{initialItems.length ? "Try another tab or search term." : "Find someone relevant, draft a thoughtful note, and your real activity will appear here."}</p>{!initialItems.length ? <Link className="button button-dark" href="/people">Find someone relevant</Link> : null}</div> : null}
      </section>

      <section className="outreach-note"><Sparkles size={18} /><div><strong>Quality over cadence</strong><p>Twenty will never auto-send a sequence. It suggests one follow-up when there is a useful reason to reconnect, then asks you to review it.</p></div><Link href="/settings?tab=trust">Review outreach principles <ArrowRight size={14} /></Link></section>
    </div>
  );
}
