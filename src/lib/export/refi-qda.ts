import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import type { Codebook, CodedSegment } from "../codebook/types";

/**
 * Export to REFI-QDA Project (.qdpx) — the open standard for QDA software
 * interchange. Compatible with ATLAS.ti 22+, NVivo 12+, MAXQDA 2020+,
 * Quirkos, Taguette and others.
 *
 * Spec: https://www.qdasoftware.org/
 *
 * A .qdpx file is a ZIP archive containing:
 *   - project.qde   (main XML manifest)
 *   - sources/      (source documents, optional)
 *
 * This implementation focuses on the CodeBook + Cases + Codings,
 * which is the minimum ATLAS.ti needs for round-trip.
 */

interface BuildOptions {
  projectName: string;
  documentName: string;
  documentText: string;
  codebook: Codebook;
  segments: CodedSegment[];
}

export async function buildQdpx(opts: BuildOptions): Promise<Blob> {
  const zip = new JSZip();
  zip.file("project.qde", buildProjectXml(opts));
  // Embed source plain text alongside (ATLAS.ti will read it as a TXT source)
  zip.folder("sources")?.file(`${slug(opts.documentName)}.txt`, opts.documentText);
  return zip.generateAsync({ type: "blob", mimeType: "application/x-qdpx" });
}

function buildProjectXml({
  projectName,
  documentName,
  documentText,
  codebook,
  segments,
}: BuildOptions): string {
  const projectGuid = uuidv4();
  const sourceGuid = uuidv4();
  const sourcePath = `internal://sources/${slug(documentName)}.txt`;

  // Map every applied (axis, code) pair to a stable GUID
  const codeGuids = new Map<string, string>();
  for (const axis of codebook.axes) {
    for (const code of axis.codes) {
      codeGuids.set(`${axis.axis_id}:${code.code}`, uuidv4());
    }
  }

  const codeBookXml = codebook.axes
    .map((axis) => {
      const codes = axis.codes
        .map((c) => {
          const guid = codeGuids.get(`${axis.axis_id}:${c.code}`)!;
          return `      <Code guid="${guid}" name="${esc(`${c.code} ${c.name}`)}" isCodable="true" color="${axisColor(axis.axis_id)}">
        <Description>${esc(c.definition)}</Description>
      </Code>`;
        })
        .join("\n");
      return `    <Code guid="${uuidv4()}" name="${esc(axis.name)}" isCodable="false" color="${axisColor(axis.axis_id)}">
      <Description>${esc(axis.description ?? "")}</Description>
${codes}
    </Code>`;
    })
    .join("\n");

  const codingsXml = segments
    .flatMap((seg) =>
      seg.applied.map((a) => {
        const codeGuid = codeGuids.get(`${a.axis_id}:${a.code}`);
        if (!codeGuid) return "";
        return `      <PlainTextSelection guid="${uuidv4()}" startPosition="${seg.start}" endPosition="${seg.end}" name="${esc(seg.text.slice(0, 60))}">
        <Coding guid="${uuidv4()}">
          <CodeRef targetGUID="${codeGuid}" />
        </Coding>
        ${seg.memo ? `<Description>${esc(seg.memo)}</Description>` : ""}
      </PlainTextSelection>`;
      }),
    )
    .filter(Boolean)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="urn:QDA-XML:project:1.0" name="${esc(projectName)}" origin="Strata 0.1.0" creatingUserGUID="${uuidv4()}" creationDateTime="${new Date().toISOString()}">
  <Users>
    <User guid="${uuidv4()}" name="Strata Coder" />
  </Users>
  <CodeBook>
    <Codes>
${codeBookXml}
    </Codes>
  </CodeBook>
  <Sources>
    <TextSource guid="${sourceGuid}" name="${esc(documentName)}" plainTextPath="${sourcePath}" creatingUserGUID="${uuidv4()}" creationDateTime="${new Date().toISOString()}">
      <PlainTextContent>${esc(documentText)}</PlainTextContent>
${codingsXml}
    </TextSource>
  </Sources>
  <Description>Exported from Strata 層析. Codebook: ${esc(codebook.name)} v${codebook.version}.</Description>
</Project>
`;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function slug(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
}

function axisColor(axis_id: string) {
  if (axis_id === "surface") return "#0EA5E9";
  if (axis_id === "deep") return "#8B5CF6";
  return "#6366F1";
}
