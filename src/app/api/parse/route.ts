import { NextResponse } from "next/server";
import { parseFile } from "@/lib/parse/document";

// Route segment config (Next.js 13+ App Router)
export const runtime = "nodejs";
export const maxDuration = 60; // seconds; allows PDF parsing of larger docs on Vercel Pro

/**
 * POST /api/parse
 * Body: multipart/form-data with a single "file" field.
 * Returns: { name, size_bytes, text, page_count?, word_count, char_count }
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseFile(buffer, file.name);
    return NextResponse.json({
      name: file.name,
      size_bytes: file.size,
      ...parsed,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "parse failed" },
      { status: 500 },
    );
  }
}
