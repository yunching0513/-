"use client";

import type { Interpellation } from "./ly";

export function buildLyDocText(i: Interpellation): string {
  const memberTag = i.members.length > 0 ? i.members.join("、") : "立委";
  const lines = [
    `【${memberTag}】${i.subject}`,
    "",
    `（${i.meeting_label}；刊登於 ${i.publish_date}）`,
    "",
    "【說明】",
    i.content,
    "",
    `（來源：立法院公報 — ly.govapi.tw 質詢編號 ${i.id}）`,
  ];
  return lines.join("\n");
}

export type { Interpellation };
