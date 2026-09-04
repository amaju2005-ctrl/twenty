import { PeopleDiscovery } from "@/components/people-discovery";
import { getPeopleForCurrentUser } from "@/lib/people-server";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const initial = await getPeopleForCurrentUser();
  return <PeopleDiscovery initialPeople={initial.people} initialMode={initial.mode} />;
}
