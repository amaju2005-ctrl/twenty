"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Compass,
  HelpCircle,
  LayoutDashboard,
  Mail,
  Menu,
  Search,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { demoUser } from "@/lib/data";
import { Avatar } from "@/components/ui";
import { Logo } from "@/components/logo";

const nav = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/people", label: "Discover", icon: Compass },
  { href: "/outreach", label: "Outreach", icon: Mail },
];

const secondary = [
  { href: "/settings?tab=profile", label: "My profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

type ShellFocus = { title: string; detail: string };

export function AppShell({
  children,
  user = demoUser,
  focus = { title: "Climate tech", detail: "Strategy & operations · London" },
  outreachAttentionCount = 2,
  shortlistCount = 12,
}: {
  children: React.ReactNode;
  user?: typeof demoUser;
  focus?: ShellFocus;
  outreachAttentionCount?: number;
  shortlistCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="app-frame">
      <button className="mobile-menu-button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
      {open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-head">
          <Logo inverse href="/dashboard" />
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <button className="command-search" onClick={() => setOpen(false)}>
          <Search size={16} />
          <span>Search</span>
          <kbd>⌘ K</kbd>
        </button>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {nav.map(({ href, label, icon: Icon }) => {
            const count = href === "/outreach" ? outreachAttentionCount : 0;
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)} className={isActive(href) ? "active" : ""}>
                <Icon size={18} /><span>{label}</span>{count ? <small>{count}</small> : null}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-focus">
          <div className="focus-label"><Sparkles size={14} /> Current focus</div>
          <p>{focus.title}</p>
          <span>{focus.detail}</span>
          <Link href="/settings?tab=goals">Edit focus</Link>
        </div>

        <nav className="sidebar-nav sidebar-nav-bottom" aria-label="Account navigation">
          {secondary.map(({ href, label, icon: Icon }) => (
            <Link key={label} href={href} onClick={() => setOpen(false)} className={isActive(href) ? "active" : ""}>
              <Icon size={18} /><span>{label}</span>
            </Link>
          ))}
          <Link href="#help"><HelpCircle size={18} /><span>Help</span></Link>
        </nav>

        <div className="sidebar-user">
          <Avatar initials={user.initials} size="sm" />
          <span><strong>{user.name}</strong><small>Free plan · {shortlistCount} of 20</small></span>
          <button aria-label="View notifications"><Bell size={17} /></button>
        </div>
      </aside>

      <main className="app-content">
        <div className="mobile-topbar">
          <Logo href="/dashboard" />
          <div><button aria-label="Notifications"><Bell size={19} /></button><Avatar initials={user.initials} size="sm" /></div>
        </div>
        {children}
      </main>
    </div>
  );
}
