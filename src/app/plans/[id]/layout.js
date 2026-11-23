import { devotionals } from "@/data/devotionals";
import { getCustomDevotionalById } from "@/app/actions/dbActions";
import {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  toAbsoluteUrl,
  serializeJsonLd,
  truncateDescription,
} from "@/lib/seo";

async function resolvePlanById(id) {
  let plan = devotionals[id];
  if (!plan) {
    const res = await getCustomDevotionalById(id);
    if (res?.success && res?.plan) {
      plan = res.plan;
    }
  }
  return plan || null;
}

function buildPlanDescription(plan) {
  const days = Array.isArray(plan?.days) ? plan.days : [];
  const dayCount = days.length;
  const categoryLabel = plan?.category || "Faith";
  const firstReflection = days[0]?.reflection || "";
  const summary = `${dayCount}-day ${categoryLabel} devotional plan on PraisePage.`;
  return truncateDescription(firstReflection ? `${summary} ${firstReflection}` : summary, 155);
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const plan = await resolvePlanById(id);

  if (!plan) {
    return {
      title: "Plan Not Found",
    };
  }

  const title = `${plan.title} Devotional Plan`;
  const description = buildPlanDescription(plan);
  const canonicalPath = `/plans/${encodeURIComponent(id)}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${title} | PraisePage`,
      description,
      url: toAbsoluteUrl(canonicalPath),
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | PraisePage`,
      description,
    },
  };
}

export default async function PlanPlayerLayout({ children, params }) {
  const { id } = await params;
  const plan = await resolvePlanById(id);
  const days = Array.isArray(plan?.days) ? plan.days : [];
  const canonicalUrl = toAbsoluteUrl(`/plans/${encodeURIComponent(id)}`);
  const imageUrl = toAbsoluteUrl(plan?.image || DEFAULT_OG_IMAGE);

  const schemaJson = plan
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: SITE_URL,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Devotional Plans",
                item: toAbsoluteUrl("/plans"),
              },
              {
                "@type": "ListItem",
                position: 3,
                name: plan.title,
                item: canonicalUrl,
              },
            ],
          },
          {
            "@type": "CreativeWorkSeries",
            name: `${plan.title} Devotional Plan`,
            description: buildPlanDescription(plan),
            numberOfItems: days.length,
            genre: "Faith & Devotional",
            about: plan.category || "Faith",
            isAccessibleForFree: true,
            image: imageUrl,
            url: canonicalUrl,
            provider: {
              "@type": "Organization",
              name: "PraisePage",
              url: SITE_URL,
            },
            hasPart: days.map((d, idx) => ({
              "@type": "CreativeWork",
              position: d.day || idx + 1,
              name: d.title,
              text: truncateDescription(d.reflection || "", 160),
              ...(d.verseTag ? { citation: d.verseTag } : {}),
            })),
          },
        ],
      }
    : null;

  return (
    <>
      {schemaJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemaJson) }}
        />
      )}
      {children}
    </>
  );
}
