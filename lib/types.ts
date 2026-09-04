export type ContactStatus = "verified" | "likely" | "unavailable" | "not_sought";

export type Person = {
  id: string;
  name: string;
  initials: string;
  role: string;
  company: string;
  location: string;
  score: number;
  responseLikelihood: "High" | "Medium" | "Selective";
  relationship: string;
  rationale: string;
  signals: string[];
  experience: { company: string; role: string; period: string }[];
  education: string[];
  contact: {
    status: ContactStatus;
    email?: string;
    confidence?: number;
    source?: string;
    sourceUrl?: string;
    checkedAt?: string;
    note: string;
  };
  social?: { linkedin?: string; website?: string };
  tags: string[];
  lastActive?: string;
  dataSource?: string;
  sourceUrls?: string[];
};

export type OutreachStatus = "draft" | "scheduled" | "sent" | "replied" | "follow_up";

export type OutreachItem = {
  id: string;
  personId: string;
  subject: string;
  status: OutreachStatus;
  sentAt?: string;
  nextStep: string;
  updatedAt: string;
};
