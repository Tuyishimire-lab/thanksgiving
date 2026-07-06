export default function manifest() {
  return {
    name: "PraisePage",
    short_name: "PraisePage",
    description: "Explore devotional plans, scripture highlights, community testimonies, and reflections to anchor your life in gratitude and faith.",
    start_url: "/",
    display: "standalone",
    background_color: "#131417",
    theme_color: "#131417",
    icons: [
      {
        src: "/assets/images/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/assets/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/assets/images/praisepage.jpeg",
        sizes: "1024x1024",
        type: "image/jpeg"
      }
    ],
    orientation: "portrait",
    categories: ["faith", "devotional", "community"]
  };
}
