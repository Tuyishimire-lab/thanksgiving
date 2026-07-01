import { devotionals } from "@/data/devotionals";
import { getCustomDevotionalById } from "@/app/actions/dbActions";

export async function generateMetadata({ params }) {
  const { id } = await params;
  let plan = devotionals[id];

  if (!plan) {
    const res = await getCustomDevotionalById(id);
    if (res.success && res.plan) {
      plan = res.plan;
    }
  }

  if (!plan) {
    return {
      title: "Plan Not Found",
    };
  }

  return {
    title: `${plan.title} Devotional Plan`,
    description: `Start reading the "${plan.title}" plan in our devotional area. Track your daily reflections, highlights, and growth.`,
  };
}

export default function PlanPlayerLayout({ children }) {
  return children;
}
