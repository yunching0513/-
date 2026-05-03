import type { Codebook } from "../types";

/**
 * Built-in codebook: stakeholder × position framework, useful for
 * quickly mapping who-says-what in a hearing transcript.
 */
export const stakeholderPositionCodebook: Codebook = {
  codebook_id: "stakeholder-position-v1",
  name: "利害關係人立場分析 v1.0",
  domain: "公聽會／聽證會通用",
  version: "1.0",
  methodology: "hierarchical",
  description:
    "以發言者類型為基礎的階層式編碼，協助分析「誰關心什麼」以及不同立場群體之分布。",
  axes: [
    {
      axis_id: "stakeholder",
      name: "利害關係人類型",
      cardinality: "exclusive",
      codes: [
        { code: "ST1", name: "受影響居民" },
        { code: "ST1.1", name: "私產權人", parent: "ST1" },
        { code: "ST1.2", name: "承租戶", parent: "ST1" },
        { code: "ST1.3", name: "原住戶代表", parent: "ST1" },
        { code: "ST2", name: "政府方" },
        { code: "ST2.1", name: "中央主管機關", parent: "ST2" },
        { code: "ST2.2", name: "地方政府代表", parent: "ST2" },
        { code: "ST2.3", name: "民意代表", parent: "ST2" },
        { code: "ST3", name: "實施者／業者", parent: undefined },
        { code: "ST3.1", name: "建商／開發商", parent: "ST3" },
        { code: "ST3.2", name: "都更中心／執行單位", parent: "ST3" },
        { code: "ST4", name: "專家學者" },
        { code: "ST5", name: "公民團體／NGO" },
      ].map((c) => ({ ...c, definition: c.name })),
    },
  ],
  annotations: { memo: true, confidence: false },
};
