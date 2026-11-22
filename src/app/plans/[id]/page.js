import { devotionals } from "@/data/devotionals";
import { getPlanPlayerData } from "@/app/actions/dbActions";
import PlanPlayerClient from "./PlanPlayerClient";

export default async function PlanPlayerPage({ params }) {
  const { id } = await params;
  const data = await getPlanPlayerData(id);
  const plan = data.customPlan || devotionals[id] || null;

  return (
    <PlanPlayerClient
      planId={id}
      planData={plan}
      initialUser={data.user}
      initialProgress={data.progress}
      initialReflections={data.reflections || {}}
      initialHighlights={data.highlights || {}}
    />
  );
}
