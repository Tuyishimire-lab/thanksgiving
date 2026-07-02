import { posts } from "@/data/posts";
import { devotionals } from "@/data/devotionals";
import { bibleBooks } from "@/data/bibleBooks";
import { getCustomDevotionals } from "@/app/actions/dbActions";

export default async function sitemap() {
  const baseUrl = "https://praisepage.com";

  // Static core routes
  const staticUrls = [
    "",
    "/bible",
    "/plans",
    "/feed",
    "/prayers",
    "/quotes",
    "/contacts",
    "/share",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));

  // Static devotional plans from file
  const staticPlanUrls = Object.keys(devotionals).map((key) => ({
    url: `${baseUrl}/plans/${key}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Custom public devotional plans from database
  let customPlanUrls = [];
  try {
    const customRes = await getCustomDevotionals();
    if (customRes && customRes.success && Array.isArray(customRes.plans)) {
      customPlanUrls = customRes.plans.map((plan) => {
        let parsedDate;
        try {
          parsedDate = plan.created_at ? new Date(plan.created_at).toISOString() : new Date().toISOString();
        } catch (e) {
          parsedDate = new Date().toISOString();
        }
        return {
          url: `${baseUrl}/plans/${plan.id}`,
          lastModified: parsedDate,
          changeFrequency: "weekly",
          priority: 0.7,
        };
      });
    }
  } catch (error) {
    console.error("Error fetching custom devotionals for sitemap:", error);
  }

  // Bible books and chapters (total 1,189 chapters)
  const bibleUrls = [];
  bibleBooks.forEach((book) => {
    for (let c = 1; c <= book.chapters; c++) {
      bibleUrls.push({
        url: `${baseUrl}/bible?book=${encodeURIComponent(book.name)}&chapter=${c}`,
        lastModified: new Date().toISOString(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  });

  // Blog posts
  const postUrls = posts.map((post) => {
    let parsedDate;
    try {
      parsedDate = new Date(post.date).toISOString();
    } catch (e) {
      parsedDate = new Date().toISOString();
    }
    return {
      url: `${baseUrl}/posts/${post.id}`,
      lastModified: parsedDate,
      changeFrequency: "monthly",
      priority: 0.6,
    };
  });

  return [...staticUrls, ...staticPlanUrls, ...customPlanUrls, ...postUrls, ...bibleUrls];
}
