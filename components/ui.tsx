import type { ContactStatus } from "@/lib/types";

const avatarTones = ["tone-coral", "tone-mint", "tone-blue", "tone-gold", "tone-lilac"];

export function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const tone = avatarTones[(initials.charCodeAt(0) + initials.charCodeAt(1)) % avatarTones.length];
  return <span className={`avatar avatar-${size} ${tone}`}>{initials}</span>;
}

export function Score({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <span className={`score ${compact ? "score-compact" : ""}`} style={{ "--score": `${value * 3.6}deg` } as React.CSSProperties}>
      <span>{value}</span>
    </span>
  );
}

export function ContactBadge({ status }: { status: ContactStatus }) {
  const labels: Record<ContactStatus, string> = {
    verified: "Verified work email",
    likely: "Needs verification",
    unavailable: "No trusted contact",
    not_sought: "Work email not checked",
  };
  return <span className={`contact-badge contact-${status}`}><span className="status-dot" />{labels[status]}</span>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function ProgressBar({ value }: { value: number }) {
  return <span className="progress-track" aria-label={`${value}% complete`}><span style={{ width: `${value}%` }} /></span>;
}
