import "server-only";

/**
 * Server-side document parsing.
 *
 * Supported formats:
 *   - .pdf  via pdf-parse
 *   - .docx via mammoth
 *   - .txt  passthrough
 */
export interface ParsedDocument {
  text: string;
  page_count?: number;
  word_count: number;
  char_count: number;
}

export async function parseFile(
  buffer: Buffer,
  filename: string,
): Promise<ParsedDocument> {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") {
    // Import the internal module to bypass pdf-parse's index.js side-effect
    // (which tries to read a test PDF and breaks on serverless platforms).
    // @ts-expect-error — pdf-parse has no types for the internal path
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const data = await pdfParse(buffer);
    return finalize(data.text, data.numpages);
  }
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return finalize(result.value);
  }
  if (ext === "txt" || ext === "md") {
    return finalize(buffer.toString("utf-8"));
  }
  throw new Error(`Unsupported file format: .${ext}`);
}

function finalize(text: string, page_count?: number): ParsedDocument {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/ /g, " ").trim();
  return {
    text: cleaned,
    page_count,
    word_count: cleaned.split(/\s+/).filter(Boolean).length,
    char_count: cleaned.length,
  };
}

/**
 * Naive speaker segmentation for hearing transcripts.
 * Splits by patterns like 「【張三】」、「主席：」、「委員王某：」.
 */
export interface RawSegment {
  speaker?: string;
  text: string;
  start: number;
  end: number;
}

const SPEAKER_RE =
  /(?:^|\n)[【(\[]?([一-鿿A-Za-z][一-鿿A-Za-z0-9 _·\-、]{0,12})[】)\]]?\s*[：:]\s*/g;

export function splitSpeakerSegments(text: string): RawSegment[] {
  const matches: { idx: number; speaker: string }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(SPEAKER_RE);
  while ((m = re.exec(text)) !== null) {
    matches.push({ idx: m.index + (m[0].startsWith("\n") ? 1 : 0), speaker: m[1] });
  }
  if (matches.length === 0) {
    return [{ text, start: 0, end: text.length }];
  }
  const result: RawSegment[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].idx;
    const end = i + 1 < matches.length ? matches[i + 1].idx : text.length;
    const block = text.slice(start, end);
    const speakerMatch = block.match(/^[【(\[]?([^】):：\]]+)[】)\]]?\s*[：:]\s*/);
    const speaker = speakerMatch?.[1]?.trim() ?? matches[i].speaker;
    const bodyStart = start + (speakerMatch?.[0]?.length ?? 0);
    result.push({
      speaker,
      text: text.slice(bodyStart, end).trim(),
      start: bodyStart,
      end,
    });
  }
  return result;
}
