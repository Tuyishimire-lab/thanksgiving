import { devotionals } from "@/data/devotionals";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const plan = devotionals[id];

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
