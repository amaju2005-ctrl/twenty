"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, FileText, Link as Linkedin, LoaderCircle, MapPin, Search, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { Logo } from "@/components/logo";

const steps = ["Your story", "Your direction", "Your shortlist"];

export default function OnboardingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [cvText, setCvText] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [target, setTarget] = useState("Move into strategy or operations at an early-stage climate tech company");
  const [targetRoles, setTargetRoles] = useState("Strategy, operations, chief of staff");
  const [locations, setLocations] = useState("London, Cambridge, Remote UK");
  const [industries, setIndustries] = useState(["Climate tech", "Energy software"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function chooseFile(selected?: File) {
    if (!selected) return;
    setFile(selected); setParsing(true);
    setTimeout(() => { setParsing(false); setCvText("Strategy analyst with experience in market entry, commercial diligence and operating-model design. Warwick Economics graduate. Led a procurement transformation workstream and built a climate-tech side project."); }, 1100);
  }

  async function finish() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvText,
          linkedinUrl,
          target,
          targetRoles: targetRoles.split(",").map((item) => item.trim()).filter(Boolean),
          industries,
          locations: locations.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Your profile could not be saved.");
      router.push("/people");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Setup could not be completed.");
      setSaving(false);
    }
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-header"><Logo /><Link href="/login">Already have an account? <strong>Log in</strong></Link></header>
      <div className="onboarding-progress"><div>{steps.map((label, index) => <div key={label} className={step >= index + 1 ? "active" : ""}><span>{step > index + 1 ? <Check size={12} /> : index + 1}</span><strong>{label}</strong>{index < steps.length - 1 && <i />}</div>)}</div></div>

      <section className="onboarding-wrap">
        {step === 1 && <div className="onboarding-card"><div className="onboarding-title"><span className="step-icon"><FileText size={20} /></span><span className="page-kicker">Step 1 of 3</span><h1>Give us the shape of your story.</h1><p>Upload a CV or paste the useful parts. You can edit anything we extract before it becomes part of your profile.</p></div><div className="upload-zone" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); chooseFile(e.dataTransfer.files[0]); }}><input ref={fileRef} hidden type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => chooseFile(e.target.files?.[0])} />{parsing ? <><LoaderCircle className="spin" size={27} /><strong>Reading your experience…</strong><span>Extracting roles, skills and concrete outcomes</span></> : file ? <><span className="uploaded-icon"><Check size={21} /></span><strong>{file.name}</strong><span>{Math.max(1, Math.round(file.size / 1024))} KB · Ready to review</span><button onClick={(e) => { e.stopPropagation(); setFile(null); setCvText(""); }}><X size={13} /> Remove</button></> : <><Upload size={25} /><strong>Drop your CV here, or click to browse</strong><span>PDF, DOCX or TXT · Max 8 MB</span></>}</div><div className="onboarding-or"><span>or add details manually</span></div><label className="large-field"><span>Profile / CV text</span><textarea value={cvText} onChange={(e) => setCvText(e.target.value)} placeholder="Paste your current role, experience, education, side projects and the work you are proud of…" /></label><label className="url-field"><Linkedin size={16} /><input value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} placeholder="LinkedIn profile URL (optional)" /><span>Provided by you · no scraping</span></label><div className="onboarding-foot"><span><ShieldCheck size={14} /> Your original CV can be deleted at any time.</span><button className="button button-dark button-large" onClick={() => setStep(2)} disabled={!cvText && !file}>Continue <ArrowRight size={16} /></button></div></div>}

        {step === 2 && <div className="onboarding-card"><div className="onboarding-title"><span className="step-icon"><BriefcaseBusiness size={20} /></span><span className="page-kicker">Step 2 of 3</span><h1>Where are you trying to go?</h1><p>Write it like you would explain it to a thoughtful friend. Specific goals produce surprising, useful matches.</p></div><label className="large-field"><span>The move I want to make</span><textarea className="goal-textarea" value={target} onChange={(e) => setTarget(e.target.value)} /><small>Example: Move from consulting into a commercial operator role at an early-stage climate company in London.</small></label><div className="field-row"><label><span>Roles I’m exploring</span><input value={targetRoles} onChange={(event) => setTargetRoles(event.target.value)} /></label><label><span>Where</span><div className="input-with-icon"><MapPin size={15} /><input value={locations} onChange={(event) => setLocations(event.target.value)} /></div></label></div><label className="tag-field"><span>Industries & problem spaces</span><div>{industries.map((item) => <button key={item} onClick={() => setIndustries(industries.filter((x) => x !== item))}>{item}<X size={12} /></button>)}<input placeholder="Add another" onKeyDown={(e) => { if (e.key === "Enter" && e.currentTarget.value) { e.preventDefault(); setIndustries([...industries, e.currentTarget.value]); e.currentTarget.value = ""; } }} /></div></label><div className="focus-preview"><Sparkles size={17} /><div><strong>This is focused enough to discover well.</strong><p>We’ll look beyond exact job titles for people with similar transitions, useful market visibility and credible warm paths.</p></div></div><div className="onboarding-foot"><button className="back-button" onClick={() => setStep(1)}><ArrowLeft size={14} /> Back</button><button className="button button-dark button-large" onClick={() => setStep(3)} disabled={!target}>Build my shortlist <ArrowRight size={16} /></button></div></div>}

        {step === 3 && <div className="onboarding-card onboarding-final"><div className="onboarding-title"><span className="step-icon"><Search size={20} /></span><span className="page-kicker">Step 3 of 3</span><h1>Your first twenty is taking shape.</h1><p>Here is what the discovery engine will weigh. You can tune these preferences later.</p></div><div className="preference-list"><div><span className="preference-rank">01</span><div><strong>Shared path</strong><p>People who made a similar move from strategy into climate.</p></div><span className="weight high">High weight</span></div><div><span className="preference-rank">02</span><div><strong>Conversation value</strong><p>People likely to offer current, specific perspective.</p></div><span className="weight high">High weight</span></div><div><span className="preference-rank">03</span><div><strong>Warm routes</strong><p>Alumni, second-degree paths and genuine shared communities.</p></div><span className="weight medium">Balanced</span></div><div><span className="preference-rank">04</span><div><strong>Seniority mix</strong><p>Peers for practical advice, leaders for market perspective.</p></div><span className="weight medium">Balanced</span></div></div><label className="consent-check"><input type="checkbox" defaultChecked /><span><Check size={12} /></span><p>I want Twenty to save the profile and career focus I provided. Discovery runs only when I click “Find my twenty” on the next screen, and nothing is sent without my review.</p></label>{error ? <p className="onboarding-error" role="alert">{error}</p> : null}<div className="onboarding-foot"><button className="back-button" onClick={() => setStep(2)} disabled={saving}><ArrowLeft size={14} /> Back</button><button className="button button-accent button-large" onClick={finish} disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />} {saving ? "Saving your profile…" : "Continue to discovery"}</button></div></div>}
      </section>
      <aside className="onboarding-quote"><p>“The goal isn’t to know everyone. It’s to know who matters for the next part of your story.”</p></aside>
    </main>
  );
}
