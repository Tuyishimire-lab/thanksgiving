export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/profile", "/login", "/signup", "/admin"],
    },
    sitemap: "https://praisepage.com/sitemap.xml",
  };
}
