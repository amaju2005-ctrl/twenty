import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageCircleReply,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Avatar, ContactBadge, Score } from "@/components/ui";
import { demoUser, getOutreachPerson, outreach, people, weeklyActivity } from "@/lib/data";

export default function DashboardPage() {
  return (
    <div className="page dashboard-page">
      <header className="page-head dashboard-head">
        <div><span className="page-kicker">Wednesday, 19 August</span><h1>Good evening, {demoUser.firstName}.</h1><p>One thoughtful follow-up and three new people are worth your attention today.</p></div>
        <div className="page-head-actions"><button className="button button-ghost"><RefreshCw size={15} /> Refresh matches</button><Link className="button button-dark" href="/people"><Users size={15} /> Discover people</Link></div>
      </header>

      <section className="dashboard-summary">
        <div className="next-action panel">
          <div className="action-label"><Sparkles size={15} /> Next best action <span>5 min</span></div>
          <div className="action-main">
            <Avatar initials="ER" size="lg" />
            <div><h2>Follow up with Elena Rossi</h2><p>She opened your note twice, and it has been 7 days. A short, useful follow-up is ready.</p></div>
          </div>
          <div className="action-draft"><span>“Hi Elena—one useful detail I should have added…”</span><Link href="/compose/elena-rossi">Review follow-up <ArrowRight size={15} /></Link></div>
        </div>
        <div className="momentum-card panel">
          <div className="momentum-top"><div><span>This month</span><strong>Good momentum</strong></div><span className="momentum-ring">72<small>%</small></span></div>
          <div className="momentum-stats"><span><strong>14</strong>sent</span><span><strong>6</strong>replies</span><span><strong>3</strong>calls</span></div>
          <p><TrendingUp size={13} /> 43% reply rate · top 10% of focused outreach</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel recommendations-panel">
          <div className="panel-head"><div><h2>People worth knowing</h2><p>Ranked for your climate strategy goal</p></div><Link href="/people">View all 12 <ArrowRight size={13} /></Link></div>
          <div className="recommendation-list">
            {people.slice(0, 4).map((person, index) => (
              <Link href={`/people/${person.id}`} className="recommendation-row" key={person.id}>
                <span className="row-rank">0{index + 1}</span><Avatar initials={person.initials} size="md" />
                <div className="row-person"><strong>{person.name}</strong><span>{person.role} · {person.company}</span><small>{person.relationship}</small></div>
                <div className="row-contact"><ContactBadge status={person.contact.status} /></div><Score value={person.score} compact /><ChevronRight size={15} />
              </Link>
            ))}
          </div>
        </div>

        <div className="panel activity-panel">
          <div className="panel-head"><div><h2>Relationship activity</h2><p>Last 12 weeks</p></div><select aria-label="Activity period"><option>12 weeks</option></select></div>
          <div className="activity-chart">
            <div className="chart-y"><span>20</span><span>10</span><span>0</span></div>
            <div className="chart-bars">{weeklyActivity.map((value, index) => <span key={index} style={{ height: `${value * 4.4}px` }} className={index === weeklyActivity.length - 1 ? "active" : ""}><i>{value}</i></span>)}</div>
          </div>
          <div className="activity-legend"><span><i className="legend-mint" /> Quality touches</span><span>This week: <strong>20</strong></span></div>
          <div className="activity-insight"><TrendingUp size={16} /><div><strong>Consistency is working</strong><p>Your reply rate rose after you reduced volume and made each note more specific.</p></div></div>
        </div>
      </section>

      <section className="panel pipeline-panel">
        <div className="panel-head"><div><h2>Active conversations</h2><p>Your current outreach, ordered by next step</p></div><Link href="/outreach">Open outreach <ArrowRight size={13} /></Link></div>
        <div className="pipeline-table">
          {outreach.slice(0, 4).map((item) => {
            const person = getOutreachPerson(item);
            const statusLabel = item.status === "follow_up" ? "Follow-up" : item.status[0].toUpperCase() + item.status.slice(1);
            return <Link href={`/compose/${person.id}`} className="pipeline-row" key={item.id}><Avatar initials={person.initials} size="sm" /><div className="pipeline-person"><strong>{person.name}</strong><span>{person.company}</span></div><div className="pipeline-subject">{item.subject}</div><span className={`status-pill status-${item.status}`}>{statusLabel}</span><div className="pipeline-next">{item.nextStep}</div><ChevronRight size={15} /></Link>;
          })}
        </div>
      </section>

      <section className="dashboard-bottom">
        <div className="panel weekly-plan">
          <div className="panel-head"><div><h2>Your focused week</h2><p>Small, high-quality actions</p></div><span className="plan-count">2 / 4 done</span></div>
          <div className="plan-list">
            <div className="done"><CheckCircle2 size={17} /><span><strong>Research 3 strong matches</strong><small>Completed Monday</small></span></div>
            <div className="done"><CheckCircle2 size={17} /><span><strong>Send 2 tailored notes</strong><small>Completed yesterday</small></span></div>
            <div><Clock3 size={17} /><span><strong>Follow up with Elena</strong><small>Recommended today</small></span><Link href="/compose/elena-rossi">Do now</Link></div>
            <div><CalendarCheck size={17} /><span><strong>Prepare for Maya call</strong><small>Friday · 11:00</small></span><button>View notes</button></div>
          </div>
        </div>
        <div className="panel response-principle">
          <div className="principle-icon"><MessageCircleReply size={20} /></div><span className="page-kicker">One useful principle</span><h2>Ask for perspective,<br />not a position.</h2><p>The strongest first message opens a conversation. It does not make the recipient responsible for your career.</p><Link href="/people">Find someone relevant <ArrowRight size={14} /></Link>
        </div>
      </section>
    </div>
  );
}
