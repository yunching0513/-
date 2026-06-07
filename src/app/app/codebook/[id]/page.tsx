import { BUILTIN_CODEBOOKS } from "@/lib/codebook/builtin";
import CodebookDetailClient from "./detail-client";

/**
 * Required for Tauri's static export — Next.js needs to know every dynamic
 * route ID at build time. We pre-render built-in codebooks here. User-imported
 * codebooks aren't known until runtime, but they're reached via client-side
 * navigation from the library so it still works in practice.
 */
export function generateStaticParams() {
  return BUILTIN_CODEBOOKS.map((c) => ({ id: c.codebook_id }));
}

// `dynamicParams` must be omitted for static export — Next.js will still
// resolve unknown ids client-side via the SPA router as long as the user
// navigates via <Link>.

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CodebookDetailClient id={id} />;
}
