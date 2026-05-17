"use client";

import type { Codebook, CodedSegment } from "../codebook/types";
import { buildExcelWorkbook } from "./excel";
import { buildQdpx } from "./refi-qda";
import type { StrataDocument } from "../store/strata";

/**
 * Browser-side exporters that use the current store state (no server needed).
 * Wraps the same builders used by the API routes.
 */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

export function downloadExcel(
  segments: CodedSegment[],
  codebook: Codebook,
  documentName: string,
) {
  const buf = buildExcelWorkbook(segments, codebook, documentName);
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, `strata-${slugify(documentName)}.xlsx`);
}

export async function downloadQdpx(
  segments: CodedSegment[],
  codebook: Codebook,
  document: StrataDocument,
) {
  const blob = await buildQdpx({
    projectName: `Strata · ${document.name}`,
    documentName: document.name,
    documentText: document.parsed_text,
    codebook,
    segments,
  });
  triggerDownload(blob, `strata-${slugify(document.name)}.qdpx`);
}

function slugify(s: string) {
  return (
    s
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^\p{L}\p{N}._-]+/gu, "-")
      .slice(0, 60) || "project"
  );
}
