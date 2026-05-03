import { NextResponse } from "next/server";
import { dualLayerPJxBE } from "@/lib/codebook/builtin";
import { SAMPLE_DOCUMENT, SAMPLE_SEGMENTS } from "@/lib/seed/sample-segments";
import { buildExcelWorkbook } from "@/lib/export/excel";
import { buildQdpx } from "@/lib/export/refi-qda";

/**
 * Export endpoint.
 *   GET /api/export?format=xlsx
 *   GET /api/export?format=qdpx
 *
 * Wired to the demo dataset for now; will accept a project_id once persistence
 * is implemented.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "xlsx";

  if (format === "xlsx") {
    const buf = buildExcelWorkbook(SAMPLE_SEGMENTS, dualLayerPJxBE, SAMPLE_DOCUMENT.name);
    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="strata-export.xlsx"`,
      },
    });
  }

  if (format === "qdpx") {
    const blob = await buildQdpx({
      projectName: "Strata 範例專案",
      documentName: SAMPLE_DOCUMENT.name,
      documentText: SAMPLE_DOCUMENT.parsed_text,
      codebook: dualLayerPJxBE,
      segments: SAMPLE_SEGMENTS,
    });
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/x-qdpx",
        "Content-Disposition": `attachment; filename="strata-project.qdpx"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
