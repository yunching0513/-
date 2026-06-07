/**
 * Strata Next.js config.
 *
 * Runs in two modes:
 *   - `npm run build` → standard Vercel build with API routes
 *   - `npm run build:tauri` → static export (TAURI_BUILD=1), API routes dropped
 *
 * In Tauri mode, every page must be self-contained client-side. The desktop
 * app talks directly to AI providers (and public data sources) via Tauri's
 * HTTP plugin or browser fetch — no Strata backend involved.
 */

const isTauri = process.env.TAURI_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isTauri
    ? {
        output: "export",
        images: { unoptimized: true },
        // Trailing slashes help Tauri's webview resolve routes from disk
        trailingSlash: true,
      }
    : {
        experimental: {
          serverActions: { bodySizeLimit: "25mb" },
        },
        serverExternalPackages: ["pdf-parse", "mammoth"],
      }),
};

export default nextConfig;
