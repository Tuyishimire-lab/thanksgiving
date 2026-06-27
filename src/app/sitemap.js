import { posts } from "@/data/posts";

export default async function sitemap() {
  const baseUrl = "https://thanksgivings.vercel.app";

  const staticUrls = [
    "",
    "/bible",
    "/plans",
    "/feed",
    "/quotes",
    "/contacts",
    "/share",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));

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

  return [...staticUrls, ...postUrls];
}
