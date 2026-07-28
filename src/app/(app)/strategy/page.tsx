import { redirect } from "next/navigation";

import { MARKETING_TOPIC_HREF } from "@/components/dashboard/dashboard-home/phase-query";

/** Compatibility shim — Marketing Topic UI lives on the dashboard. */
export default function StrategyPage() {
  redirect(MARKETING_TOPIC_HREF);
}
