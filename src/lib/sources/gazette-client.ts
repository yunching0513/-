"use client";

import type { GazetteAgenda } from "./gazette";

export function buildAgendaName(a: GazetteAgenda): string {
  const date = a.dates[0] ?? "";
  const subj = a.subject.slice(0, 30);
  return `公報｜第${a.term}屆第${a.session}會期 第${a.meeting}次：${subj}（${date}）`;
}

export type { GazetteAgenda };
