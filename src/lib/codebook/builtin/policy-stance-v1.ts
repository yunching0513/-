import type { Codebook } from "../types";

/**
 * Built-in codebook: a simple stance-and-issue codebook for general public
 * hearing analysis. Useful for newcomers who want a low-friction starting point.
 */
export const policyStanceCodebook: Codebook = {
  codebook_id: "policy-stance-v1",
  name: "公共政策立場與議題分析 v1.0",
  domain: "公聽會／聽證會通用",
  version: "1.0",
  methodology: "multi_axis",
  description:
    "基礎入門編碼簿。將每段論述同時依「立場」與「議題類型」兩軸標記，適合首次進行公共政策文本分析的使用者。",

  axes: [
    {
      axis_id: "stance",
      name: "立場",
      color_token: "surface_axis",
      cardinality: "exclusive",
      codes: [
        { code: "S1", name: "支持", definition: "明確表達贊同政策／提案。" },
        { code: "S2", name: "反對", definition: "明確表達反對政策／提案。" },
        { code: "S3", name: "有條件支持", definition: "支持但提出修正或前提條件。" },
        { code: "S4", name: "中立／陳述", definition: "陳述事實或提問，未表達立場。" },
      ],
    },
    {
      axis_id: "issue",
      name: "議題類型",
      color_token: "deep_axis",
      cardinality: "multiple",
      codes: [
        { code: "I1", name: "程序與透明度", definition: "涉及流程、通知、資訊揭露。" },
        { code: "I2", name: "財產與經濟影響", definition: "補償、價值、稅務、土地。" },
        { code: "I3", name: "環境與健康", definition: "污染、噪音、生態、公衛。" },
        { code: "I4", name: "社會與文化", definition: "社區、文化資產、弱勢族群。" },
        { code: "I5", name: "法規與權利", definition: "法律解釋、權利保障、爭訟。" },
        { code: "I6", name: "技術與專業", definition: "工程、規劃、技術可行性。" },
      ],
    },
  ],

  annotations: {
    memo: true,
    confidence: true,
  },
};
