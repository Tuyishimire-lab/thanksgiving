/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep native libSQL packages externalized on the server
  serverExternalPackages: ["@libsql/client", "libsql"],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
  },
  compress: true,
};

export default nextConfig;
