"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, Check, ChevronRight, Database, FileText, KeyRound, Link2, LockKeyhole, Mail, Save, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { Avatar, ProgressBar } from "@/components/ui";
import { demoUser } from "@/lib/data";

const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "goals", label: "Career focus", icon: SlidersHorizontal },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "trust", label: "Trust & privacy", icon: ShieldCheck },
];

type IntegrationStatus = {
  discoveryConfigured: boolean;
  emailFinderConfigured: boolean;
  aiConfigured: boolean;
  gmailConfigured: boolean;
  gmailConnected: boolean;
  demoMode: boolean;
};

export default function SettingsPage() {
  return <Suspense fallback={<div className="page"><div className="panel" style={{ minHeight: 500 }} /></div>}><SettingsContent /></Suspense>;
}

function SettingsContent() {
  const search = useSearchParams();
  const [active, setActive] = useState(search.get("tab") || "profile");
  const [saved, setSaved] = useState(false);
  const [digest, setDigest] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/integrations/status", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<IntegrationStatus> : null)
      .then((status) => { if (status) setIntegrations(status); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return (
    <div className="page settings-page">
      <header className="page-head"><div><span className="page-kicker">Your workspace</span><h1>Settings</h1><p>Control your profile, integrations and the principles that shape your outreach.</p></div></header>
      <div className="settings-layout">
        <nav className="settings-nav panel">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}><Icon size={16} /><span>{label}</span><ChevronRight size={14} /></button>)}</nav>
        <main className="settings-content panel">
          {active === "profile" && <section><div className="settings-title"><div><h2>Your profile</h2><p>This context helps Twenty understand your story and write in your voice.</p></div><button className="button button-dark" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1800); }}><Save size={14} /> {saved ? "Saved" : "Save changes"}</button></div><div className="profile-setting"><Avatar initials={demoUser.initials} size="xl" /><div><button className="button button-ghost">Change photo</button><p>JPG or PNG · Max 2 MB</p></div></div><div className="form-grid"><label><span>Full name</span><input defaultValue={demoUser.name} /></label><label><span>Preferred email</span><input defaultValue={demoUser.email} /></label><label className="full"><span>Current headline</span><input defaultValue={demoUser.headline} /></label><label className="full"><span>Your story</span><textarea defaultValue="I work in strategy and enjoy turning ambiguous commercial problems into practical decisions. I’m now looking to move closer to building—ideally at an early-stage climate company where commercial work and mission are tightly connected." /></label><label className="full"><span>LinkedIn profile</span><input defaultValue="https://linkedin.com/in/alex-morgan" /></label></div><div className="profile-completeness"><div><span>Profile strength</span><strong>86%</strong></div><ProgressBar value={86} /><p>Add one concrete project outcome to improve matching and draft quality.</p></div></section>}

          {active === "goals" && <section><div className="settings-title"><div><h2>Career focus</h2><p>Be specific enough for strong matches, broad enough to discover surprising paths.</p></div><button className="button button-dark"><Save size={14} /> Save focus</button></div><div className="focus-summary"><span className="page-kicker">Current focus</span><h3>{demoUser.target}</h3><div><span>Strategy & operations</span><span>Seed to Series B</span><span>London / hybrid</span></div></div><div className="form-grid"><label className="full"><span>What move are you trying to make?</span><textarea defaultValue="Move from strategy consulting into a strategy, operations or chief of staff role at an early-stage climate technology company." /></label><label><span>Target industries</span><input defaultValue="Climate tech, energy, carbon markets" /></label><label><span>Target locations</span><input defaultValue="London, Cambridge, Remote UK" /></label><label><span>Company stage</span><select defaultValue="seed"><option value="seed">Seed to Series B</option><option>Any early-stage company</option><option>Growth stage</option></select></label><label><span>Time horizon</span><select defaultValue="3"><option value="3">Next 3 months</option><option>Next 6 months</option><option>Exploring</option></select></label></div><div className="goal-boundary"><LockKeyhole size={17} /><div><strong>People we will not recommend</strong><p>We exclude contacts with no clear professional relevance, personal-only details or a relationship that would make outreach inappropriate.</p></div></div></section>}

          {active === "integrations" && <section><div className="settings-title"><div><h2>Integrations</h2><p>Connect the tools that complete your workflow. You stay in control of every permission.</p></div></div><div className="integration-list"><div><span className="integration-logo gmail-logo"><Mail size={21} /></span><div><strong>Gmail</strong><p>Review and send from your inbox; sync replies and threads.</p><small><LockKeyhole size={11} /> Minimum scopes · tokens encrypted at rest</small></div><a className={`button ${integrations?.gmailConnected ? "button-ghost" : "button-dark"}`} href="/api/gmail/connect">{integrations?.gmailConnected ? "Reconnect" : "Connect Gmail"}</a></div><div><span className="integration-logo linkedin-logo">in</span><div><strong>LinkedIn profile</strong><p>Use profile details you provide for better matching.</p><small>Imported profile URL · No scraping or account access</small></div><button className="button button-ghost">Update URL</button></div><div><span className="integration-logo file-logo"><FileText size={21} /></span><div><strong>CV / résumé</strong><p>Your profile story is stored privately in your workspace.</p><small>Used for local relevance scoring · Not sent to data providers</small></div><button className="button button-ghost">Replace</button></div><div><span className="integration-logo data-logo"><Database size={21} /></span><div><strong>Hunter</strong><p>Discovers relevant professional profiles and reveals a selected work email only when you ask.</p><small>{integrations ? `${integrations.discoveryConfigured ? "Discovery ready" : "Hunter key missing"} · ${integrations.emailFinderConfigured ? "Email reveal ready" : "Hunter key missing"}` : "Checking secure server configuration…"}</small></div><span className={`setup-chip ${integrations?.discoveryConfigured && integrations?.emailFinderConfigured ? "setup-chip-live" : ""}`}>{integrations?.discoveryConfigured && integrations?.emailFinderConfigured ? "Live" : "Setup needed"}</span></div></div></section>}

          {active === "notifications" && <section><div className="settings-title"><div><h2>Notifications</h2><p>Stay current without making relationship-building noisy.</p></div></div><div className="toggle-list"><div><span><strong>Reply alerts</strong><p>Tell me when a reply syncs from Gmail.</p></span><button className="toggle active"><i /></button></div><div><span><strong>Follow-up review</strong><p>Remind me when a thoughtful follow-up is due.</p></span><button className="toggle active"><i /></button></div><div><span><strong>Weekly relationship digest</strong><p>A short Monday summary of new matches and open loops.</p></span><button onClick={() => setDigest(!digest)} className={`toggle ${digest ? "active" : ""}`}><i /></button></div><div><span><strong>New match alerts</strong><p>Only alert me for unusually strong (90+) matches.</p></span><button className="toggle"><i /></button></div></div></section>}

          {active === "trust" && <section><div className="settings-title"><div><h2>Trust & privacy</h2><p>The rules Twenty follows before it recommends a person or drafts a note.</p></div></div><div className="trust-settings-hero"><ShieldCheck size={27} /><div><strong>Your relationship data is yours.</strong><p>Twenty uses it to help you choose and contact relevant people. It is never sold, used to train public models or exposed to other users.</p></div></div><div className="principle-list"><div><Check size={15} /><span><strong>Review before send</strong>No message or follow-up leaves your account without an explicit action.</span></div><div><Check size={15} /><span><strong>Professional contact routes only</strong>We do not surface personal email addresses or phone numbers.</span></div><div><Check size={15} /><span><strong>No invented context</strong>Drafts must be grounded in evidence visible to you.</span></div><div><Check size={15} /><span><strong>Focus limits by default</strong>Low daily limits discourage volume and protect recipient trust.</span></div></div><div className="data-actions"><div><KeyRound size={17} /><span><strong>Connected account data</strong><p>Download a copy of your profile, matches and outreach history.</p></span><button className="button button-ghost">Export data</button></div><div><LockKeyhole size={17} /><span><strong>Delete your account</strong><p>Permanently remove your profile, tokens and relationship history.</p></span><button className="button button-danger">Delete account</button></div></div></section>}
        </main>
      </div>
    </div>
  );
}
