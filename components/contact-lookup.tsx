"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert, Copy, LoaderCircle, LockKeyhole, Mail, Search, ShieldCheck } from "lucide-react";
import { ContactBadge } from "@/components/ui";
import type { Person } from "@/lib/types";

type Contact = Person["contact"];

export function ContactLookup({ personId, initialContact, liveData }: { personId: string; initialContact: Contact; liveData: boolean }) {
  const [contact, setContact] = useState(initialContact);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function findEmail() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/contact/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });
      const result = await response.json().catch(() => ({})) as { contact?: Contact; error?: string };
      if (!response.ok || !result.contact) throw new Error(result.error || "Work email lookup failed.");
      setContact(result.contact);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Work email lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyEmail() {
    if (!contact.email) return;
    await navigator.clipboard.writeText(contact.email);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="panel contact-panel">
      <div className="panel-head"><h2>Best contact route</h2><ShieldCheck size={17} /></div>
      <div className="contact-content">
        <ContactBadge status={contact.status} />
        {contact.email ? <>
          <div className="email-row"><span>{contact.email}</span><button onClick={copyEmail}><Copy size={12} /> {copied ? "Copied" : "Copy"}</button></div>
          {typeof contact.confidence === "number" ? <><div className="confidence-row"><span>Confidence</span><strong>{contact.confidence}%</strong></div><div className="confidence-meter"><span style={{ width: `${contact.confidence}%` }} /></div></> : null}
          <dl><dt>Source</dt><dd>{contact.sourceUrl ? <a href={contact.sourceUrl} target="_blank" rel="noreferrer">{contact.source || "View public source"}</a> : contact.source}</dd><dt>Checked</dt><dd>{contact.checkedAt ? new Date(contact.checkedAt).toLocaleDateString("en-GB") : "Recently"}</dd></dl>
        </> : <div className="no-email"><LockKeyhole size={22} /><p>{contact.note}</p>{liveData && contact.status === "not_sought" ? <button className="button button-ghost" onClick={findEmail} disabled={busy}>{busy ? <LoaderCircle className="spin" size={14} /> : <Search size={14} />} {busy ? "Checking Hunter…" : "Find work email"}</button> : null}</div>}
        {error ? <div className="contact-error" role="alert"><CircleAlert size={14} />{error}</div> : null}
        <div className="contact-note"><CircleAlert size={14} /><p>{contact.note}</p></div>
        <Link href={`/compose/${personId}`} className="button button-dark"><Mail size={15} /> Draft a thoughtful note</Link>
      </div>
    </section>
  );
}
