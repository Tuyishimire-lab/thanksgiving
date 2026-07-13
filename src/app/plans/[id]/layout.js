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

  const title = `${plan.title} Devotional Plan`;
  const description = `Start reading the "${plan.title}" plan in our devotional area. Track your daily reflections, highlights, and growth.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [
        {
          url: plan.image || "/assets/images/praisepage.jpeg",
          alt: plan.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [plan.image || "/assets/images/praisepage.jpeg"],
    },
  };
}

export default async function PlanPlayerLayout({ children, params }) {
  const { id } = await params;
  let plan = devotionals[id];

  if (!plan) {
    const res = await getCustomDevotionalById(id);
    if (res.success && res.plan) {
      plan = res.plan;
    }
  }

  const schemaJson = plan ? {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    "name": `${plan.title} Devotional Plan`,
    "description": `Start reading the "${plan.title}" plan in our devotional area. Track your daily reflections, highlights, and growth.`,
    "genre": "Faith & Devotional",
    "provider": {
      "@type": "Organization",
      "name": "PraisePage",
      "url": "https://praisepage.com"
    }
  } : null;

  return (
    <>
      {schemaJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson) }}
        />
      )}
      {children}
    </>
  );
}

