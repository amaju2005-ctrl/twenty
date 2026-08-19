"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { Logo } from "@/components/logo";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function signIn(event: React.FormEvent) {
    event.preventDefault(); setLoading(true);
    if (!isSupabaseConfigured()) { router.push("/dashboard"); return; }
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setLoading(false); setMessage(error ? error.message : "Check your inbox for a secure sign-in link.");
  }

  return (
    <main className="login-page"><section className="login-brand"><Logo inverse /><div><span className="page-kicker">Your next conversations</span><h1>Find the people who can change how you see your next move.</h1><p>Twenty helps you build career relationships with focus, context and respect.</p><ul><li><Check size={14} /> A shortlist built around your real goal</li><li><Check size={14} /> Personalised notes you always review</li><li><Check size={14} /> Professional contact routes only</li></ul></div><small>Quality over volume, by design.</small></section><section className="login-form-wrap"><div className="login-form"><span className="page-kicker">Welcome to Twenty</span><h2>Start with a good conversation.</h2><p>Enter your email and we’ll send you a secure sign-in link. No password to remember.</p><form onSubmit={signIn}><label><span>Email address</span><div><Mail size={16} /><input required type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div></label><button className="button button-dark button-large" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : null}{isSupabaseConfigured() ? "Email me a sign-in link" : "Continue to demo"}<ArrowRight size={16} /></button></form>{message && <div className="login-message">{message}</div>}<div className="login-divider"><span>or</span></div><Link href="/onboarding" className="button button-ghost button-large">Create a new profile</Link><div className="login-privacy"><LockKeyhole size={14} /><span>By continuing, you agree to thoughtful use of professional data under our <a href="#">privacy principles</a>.</span></div></div></section></main>
  );
}
