import { OutreachClient } from "@/components/outreach-client";
import { getOutreachForCurrentUser } from "@/lib/outreach-server";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  let result: Awaited<ReturnType<typeof getOutreachForCurrentUser>> = { mode: "live", items: [] };
  let loadError = "";
  try {
    result = await getOutreachForCurrentUser();
  } catch {
    loadError = "Your outreach history could not be loaded. Please refresh the page.";
  }
  return <OutreachClient initialItems={result.items} mode={result.mode} loadError={loadError} currentMonth={new Date().toISOString().slice(0, 7)} />;
}
