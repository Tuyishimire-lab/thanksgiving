export default function manifest() {
  return {
    id: "/?source=pwa",
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
    categories: ["faith", "devotional", "community"],
    shortcuts: [
      {
        name: "Home",
        short_name: "Home",
        description: "Go to your sanctuary homepage",
        url: "/?source=pwa_shortcut",
        icons: [{ src: "/assets/images/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "Bible",
        short_name: "Bible",
        description: "Read the Holy Bible",
        url: "/bible?source=pwa_shortcut",
        icons: [{ src: "/assets/images/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "Plans",
        short_name: "Plans",
        description: "View your active reading plans",
        url: "/plans?source=pwa_shortcut",
        icons: [{ src: "/assets/images/icon-192.png", sizes: "192x192" }]
      }
    ],
    screenshots: [
      {
        src: "/assets/images/screenshot-home.jpg",
        sizes: "518x1024",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "PraisePage Sanctuary Homepage"
      },
      {
        src: "/assets/images/screenshot-bible.jpg",
        sizes: "474x1024",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "Holy Bible Scripture Reading"
      },
      {
        src: "/assets/images/screenshot-plans.jpg",
        sizes: "472x1024",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "Devotional Reading Plans Guide"
      },
      {
        src: "/assets/images/screenshot-prayers.jpg",
        sizes: "473x1024",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "Prayers Request Intercession Wall"
      },
      {
        src: "/assets/images/screenshot-feed.jpg",
        sizes: "473x1024",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "Community Testimony Sharing Feed"
      }
    ]
  };
}
