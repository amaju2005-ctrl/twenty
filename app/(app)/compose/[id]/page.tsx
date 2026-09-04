import { notFound } from "next/navigation";
import { ComposeClient } from "@/components/compose-client";
import { getPersonForCurrentUser, getSenderProfileForCurrentUser } from "@/lib/people-server";

export default async function ComposePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [person, profile] = await Promise.all([
    getPersonForCurrentUser(id),
    getSenderProfileForCurrentUser(),
  ]);
  if (!person) notFound();
  return <ComposeClient initialPerson={person} profile={profile} demoMode={process.env.NEXT_PUBLIC_DEMO_MODE !== "false"} />;
}
