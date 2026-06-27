export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/profile", "/login", "/signup"],
    },
    sitemap: "https://thanksgivings.vercel.app/sitemap.xml",
  };
}
