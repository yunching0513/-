/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
