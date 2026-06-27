export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/profile", "/login", "/signup"],
    },
    sitemap: "https://thanksgivings.org/sitemap.xml",
  };
}
