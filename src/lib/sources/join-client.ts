"use client";

import type { JoinProposal } from "./join";

/**
 * Client-side helper to build the Strata document text from a JoinProposal.
 * Mirrors src/lib/sources/join.ts buildDocumentText() but importable from
 * client components (which can't pull in "server-only" modules).
 */
export function buildJoinDocText(p: JoinProposal): string {
  const lines = [
    `【${p.proposer}】${p.title}`,
    "",
    `（提議於 ${p.submitted_date}；附議 ${p.support_count} 人；留言 ${p.comment_count} 則）`,
    "",
    "【提議內容】",
    p.content,
  ];
  if (p.impact) {
    lines.push("");
    lines.push("【利益與影響】");
    lines.push(p.impact);
  }
  lines.push("");
  lines.push(`（來源：join.gov.tw — ${p.url}）`);
  return lines.join("\n");
}

export type { JoinProposal };
