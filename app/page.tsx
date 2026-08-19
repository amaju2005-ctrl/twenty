import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  LockKeyhole,
  MailCheck,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, ContactBadge, Eyebrow, Score } from "@/components/ui";
import { people } from "@/lib/data";

export default function LandingPage() {
  const featured = people.slice(0, 3);
  return (
    <main className="landing">
      <nav className="landing-nav shell">
        <Logo />
        <div className="landing-links"><a href="#how">How it works</a><a href="#trust">Our approach</a><a href="#stories">Stories</a></div>
        <div className="landing-actions"><Link href="/login" className="text-link">Log in</Link><Link href="/onboarding" className="button button-dark">Find my twenty <ArrowRight size={16} /></Link></div>
      </nav>

      <section className="hero shell">
        <div className="hero-copy">
          <Eyebrow><span className="live-dot" /> A relationship engine for your career</Eyebrow>
          <h1>Who are the <em>20 people</em> you should speak to next?</h1>
          <p className="hero-lede">Twenty turns your experience and ambition into a thoughtful shortlist—then helps you start conversations people actually want to answer.</p>
          <div className="hero-actions"><Link href="/onboarding" className="button button-accent button-large">Build my shortlist <ArrowRight size={18} /></Link><Link href="/dashboard" className="button button-ghost button-large">Explore the demo</Link></div>
          <div className="hero-proof"><span><Check size={15} /> No credit card</span><span><Check size={15} /> Review before anything sends</span><span><Check size={15} /> Your data stays yours</span></div>
        </div>

        <div className="hero-product">
          <div className="product-window">
            <div className="window-top"><div className="mini-brand"><span>20</span>twenty</div><div className="window-search"><Search size={13} /> Search your network</div><Avatar initials="AM" size="sm" /></div>
            <div className="window-body">
              <div className="window-heading"><div><small>Your next conversations</small><h3>12 strong matches</h3></div><span>Refreshed today</span></div>
              <div className="mini-list">
                {featured.map((person, index) => (
                  <div className="mini-person" key={person.id}>
                    <span className="mini-rank">0{index + 1}</span><Avatar initials={person.initials} size="sm" />
                    <span className="mini-person-copy"><strong>{person.name}</strong><small>{person.role} · {person.company}</small></span>
                    <span className="mini-reason">{person.signals[0]}</span><Score value={person.score} compact />
                  </div>
                ))}
              </div>
              <div className="insight-card"><Sparkles size={17} /><div><strong>Your strongest bridge</strong><p>Warwick alumni who moved from consulting into climate roles are 2.4× more likely to reply.</p></div><ChevronRight size={17} /></div>
            </div>
          </div>
          <div className="floating-card floating-score"><CircleCheck size={18} /><span><strong>96% relevance</strong><small>Shared path + sector fit</small></span></div>
          <div className="floating-card floating-trust"><ShieldCheck size={18} /><span><strong>Work email verified</strong><small>No personal data used</small></span></div>
        </div>
      </section>

      <section className="signal-strip"><div className="shell"><span>Built for focused, human outreach</span><div><span>Career changers</span><i /> <span>Graduates</span><i /> <span>Operators</span><i /> <span>Founders</span><i /> <span>Researchers</span></div></div></section>

      <section className="problem-section shell">
        <div className="section-heading narrow"><Eyebrow>The real problem</Eyebrow><h2>Cold outreach isn’t hard.<br />The <em>workflow</em> is.</h2><p>Finding the right person, understanding the connection, checking contact details, writing something honest, following up—every small step becomes a reason not to start.</p></div>
        <div className="workflow-before">
          <div className="workflow-chaos">
            {[
              ["01", "Search LinkedIn", "Endless filters, unclear priorities"],
              ["02", "Research profiles", "Ten tabs and scattered notes"],
              ["03", "Find an email", "Questionable sources and guesses"],
              ["04", "Draft in AI", "Generic context, generic message"],
              ["05", "Send & remember", "Lost follow-ups and no system"],
            ].map(([num, title, text]) => <div key={num}><span>{num}</span><strong>{title}</strong><small>{text}</small></div>)}
          </div>
          <div className="workflow-arrow"><ArrowRight size={20} /></div>
          <div className="workflow-twenty"><span className="brand-mark">20</span><div><strong>One considered workflow</strong><p>Your profile in. The right people out. Every step explained and under your control.</p></div></div>
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="shell">
          <div className="section-heading row-heading"><div><Eyebrow>How Twenty works</Eyebrow><h2>From ambition to <em>conversation.</em></h2></div><p>Not a database of millions. A living shortlist shaped around what you want and why someone might genuinely care.</p></div>
          <div className="how-grid">
            <article><div className="feature-number">01</div><div className="feature-icon"><UserRoundCheck size={22} /></div><h3>Tell us where you’re going</h3><p>Add your CV, experience and the move you want to make. Twenty builds a useful picture of your skills, story and goals.</p><div className="profile-mini"><span>AM</span><div><i style={{ width: "76%" }} /><i style={{ width: "56%" }} /><i style={{ width: "67%" }} /></div><CircleCheck size={18} /></div></article>
            <article><div className="feature-number">02</div><div className="feature-icon"><Target size={22} /></div><h3>Meet your highest-value people</h3><p>We rank people by shared paths, role relevance, timing, warm routes and the likelihood of a useful exchange.</p><div className="match-mini"><Avatar initials="MP" size="md" /><div><strong>Maya Patel</strong><small>Shared Warwick + consulting path</small></div><Score value={96} compact /></div></article>
            <article><div className="feature-number">03</div><div className="feature-icon"><MailCheck size={22} /></div><h3>Send something worth reading</h3><p>Draft a short, specific note grounded in both profiles. You review every word, choose the channel and decide when it goes.</p><div className="mail-mini"><i /><i /><i className="short" /><span><Check size={13} /> Specific, respectful, concise</span></div></article>
          </div>
        </div>
      </section>

      <section className="trust-section shell" id="trust">
        <div className="trust-card">
          <div className="trust-copy"><Eyebrow>Recipient trust is a product feature</Eyebrow><h2>Outreach should feel <em>human</em> on both sides.</h2><p>Twenty is designed to improve the quality of every message—not the quantity. We surface professional contact routes responsibly, explain confidence, and keep you in control.</p><ul><li><ShieldCheck size={18} /><span><strong>No hidden mass sending</strong>Every message requires review. Daily limits reward focus.</span></li><li><LockKeyhole size={18} /><span><strong>Professional data only</strong>No personal emails, phone numbers or intrusive enrichment.</span></li><li><Sparkles size={18} /><span><strong>Reasons, not flattery</strong>Drafts use real shared context and never invent familiarity.</span></li></ul><Link href="/dashboard" className="button button-light">See the trust controls <ArrowRight size={16} /></Link></div>
          <div className="trust-demo">
            <div className="trust-demo-head"><span>Contact confidence</span><small>For Maya Patel</small></div>
            <div className="trust-email"><div><strong>maya@northline.vc</strong><ContactBadge status="verified" /></div><span className="confidence-number">98<small>%</small></span></div>
            <div className="trust-detail"><span>Source</span><p>Company domain + mailbox verification</p></div>
            <div className="trust-detail"><span>Our recommendation</span><p>Reference your shared Warwick path and ask one concrete question. Keep it under 120 words.</p></div>
            <div className="trust-boundary"><LockKeyhole size={16} /><span><strong>Privacy boundary</strong>Only professional, relevant contact data is shown.</span></div>
          </div>
        </div>
      </section>

      <section className="story-section" id="stories"><div className="shell story-wrap"><Quote size={36} /><blockquote>“I stopped thinking about networking as asking strangers for favours. Twenty showed me five people with genuinely similar paths. Three replied, and one conversation changed the companies I was targeting.”</blockquote><div className="story-person"><Avatar initials="JO" size="md" /><span><strong>Jamie Osei</strong><small>Consulting → climate operations</small></span></div><div className="story-metrics"><span><strong>5</strong>thoughtful notes</span><span><strong>3</strong>replies</span><span><strong>1</strong>role referral</span></div></div></section>

      <section className="cta-section shell"><div><Eyebrow>Your next move is a person away</Eyebrow><h2>Find the people worth <em>knowing.</em></h2><p>Build your first shortlist in under five minutes. Start with one good conversation.</p><div><Link href="/onboarding" className="button button-accent button-large">Find my twenty <ArrowRight size={18} /></Link><span>Free to explore · Nothing sends without you</span></div></div><div className="cta-orbit"><span className="orbit-center">20</span>{["MP", "TO", "ER", "SK", "DC", "RM"].map((item, i) => <span className={`orbit-person orbit-${i + 1}`} key={item}>{item}</span>)}</div></section>

      <footer className="landing-footer"><div className="shell"><div><Logo inverse /><p>Better career conversations start with the right person.</p></div><div><strong>Product</strong><a href="#how">How it works</a><Link href="/dashboard">Demo</Link><a href="#trust">Trust & safety</a></div><div><strong>Company</strong><a href="#stories">Stories</a><a href="mailto:hello@twenty.so">Contact</a><a href="#">Privacy</a></div><div className="footer-note"><span>Built thoughtfully in London</span><small>© 2026 Twenty</small></div></div></footer>
    </main>
  );
}
