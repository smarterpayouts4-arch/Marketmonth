import { redirect } from "next/navigation";

import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { MARKETING_TOPIC_HREF } from "@/components/dashboard/dashboard-home/phase-query";

type DashboardPageProps = {
  searchParams: Promise<{ phase?: string | string[] }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.phase) ? params.phase[0] : params.phase;
  if (raw === "learn" || raw === "strategy") {
    redirect(MARKETING_TOPIC_HREF);
  }
  if (raw === "content") {
    redirect("/content");
  }

  return <DashboardHome />;
}
