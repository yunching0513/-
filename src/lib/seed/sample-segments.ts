import type { CodedSegment } from "../codebook/types";

/**
 * Sample coded segments demonstrating the dual-layer codebook in action.
 * Each segment shows a representative pattern from the 7 hybrid modes.
 */
export const SAMPLE_SEGMENTS: CodedSegment[] = [
  {
    id: "seg_001",
    document_id: "doc_demo",
    start: 0,
    end: 78,
    text: "永和大陳一坪換五坪，怎麼我們連兩坪都不到？同樣是都更，為什麼差這麼多？",
    speaker: "私產權人 A",
    applied: [
      { axis_id: "surface", code: "PJ2" },
      { axis_id: "deep", code: "BE1" },
    ],
    pattern_id: "anchor_defense",
    confidence: "high",
    interweaving_analysis:
      "表層上以分配公平訴諸權變比例爭議；深層上以永和大陳的外部錨點為基礎拒絕現方案。表層的分配公平訴求由深層的定錨防衛所驅動。",
    derived: { is_hybrid_strategy: true },
    created_at: "2026-04-30T09:12:00Z",
    updated_at: "2026-04-30T09:12:00Z",
  },
  {
    id: "seg_002",
    document_id: "doc_demo",
    start: 79,
    end: 145,
    text: "林洲民當初承諾的條件，現在都不算數，這是什麼樣的政府？",
    speaker: "私產權人 B",
    applied: [
      { axis_id: "surface", code: "PJ3" },
      { axis_id: "deep", code: "BE1" },
    ],
    pattern_id: "promise_anchoring",
    confidence: "high",
    interweaving_analysis:
      "表層為對實施者誠信之質疑；深層上將先前承諾錨定為期待基準，現方案被視為違反承諾而非單純更動。",
    derived: { is_hybrid_strategy: true },
    created_at: "2026-04-30T09:14:00Z",
    updated_at: "2026-04-30T09:14:00Z",
  },
  {
    id: "seg_003",
    document_id: "doc_demo",
    start: 146,
    end: 210,
    text: "估價師都被建商收買，所謂的客觀估價根本是個笑話。",
    speaker: "私產權人 C",
    applied: [
      { axis_id: "surface", code: "PJ3" },
      { axis_id: "deep", code: "BE5" },
    ],
    pattern_id: "conspiracy_interpretation",
    confidence: "medium",
    interweaving_analysis:
      "表層為對實施者誠信之指控；深層為確認偏誤——對相反證據（如獨立估價程序）以陰謀論方式選擇性否定。",
    derived: { is_hybrid_strategy: true },
    created_at: "2026-04-30T09:16:00Z",
    updated_at: "2026-04-30T09:16:00Z",
  },
  {
    id: "seg_004",
    document_id: "doc_demo",
    start: 211,
    end: 280,
    text: "我這個一樓店面跟樓上完全不一樣，不能用同一個公式換算。",
    speaker: "私產權人 D",
    applied: [
      { axis_id: "surface", code: "PJ2" },
      { axis_id: "deep", code: "BE3" },
    ],
    pattern_id: "endowment_defense",
    confidence: "high",
    interweaving_analysis:
      "表層為分配不公訴求；深層為對自有資產特殊價值之稟賦防衛，強調「我擁有」之事實本身賦予物件不可替代性。",
    derived: { is_hybrid_strategy: true },
    created_at: "2026-04-30T09:18:00Z",
    updated_at: "2026-04-30T09:18:00Z",
  },
  {
    id: "seg_005",
    document_id: "doc_demo",
    start: 281,
    end: 360,
    text: "斯文里三期已經蓋好給我們看，外牆裂縫、漏水問題一堆，建商都這樣。",
    speaker: "私產權人 E",
    applied: [
      { axis_id: "surface", code: "PJ2" },
      { axis_id: "deep", code: "BE5" },
    ],
    pattern_id: "comparison_impression",
    confidence: "medium",
    interweaving_analysis:
      "表層上訴諸跨案比較質疑分配；深層上以印象深刻之鄰近案例（斯文里三期）為可得性基礎，將個案推論為一般。",
    derived: { is_hybrid_strategy: true },
    created_at: "2026-04-30T09:20:00Z",
    updated_at: "2026-04-30T09:20:00Z",
  },
  {
    id: "seg_006",
    document_id: "doc_demo",
    start: 361,
    end: 430,
    text: "我家的房屋鋼筋外露搖搖欲墜，懇求市府加速程序，趕快讓我們可以重建。",
    speaker: "私產權人 F",
    applied: [
      { axis_id: "surface", code: "PJ1" },
      { axis_id: "deep", code: "BE2" },
    ],
    pattern_id: "procedural_lifesaving",
    confidence: "high",
    interweaving_analysis:
      "表層為對程序加速之訴求；深層為對失去（生命危險、危屋崩塌）之強烈恐懼，是少數支持都更之 Hybrid 模式。",
    derived: { is_hybrid_strategy: true },
    created_at: "2026-04-30T09:22:00Z",
    updated_at: "2026-04-30T09:22:00Z",
  },
  {
    id: "seg_007",
    document_id: "doc_demo",
    start: 431,
    end: 490,
    text: "請說明 48% 共同負擔比是怎麼算出來的，相關公式請公開。",
    speaker: "私產權人 G",
    applied: [{ axis_id: "surface", code: "PJ4" }],
    confidence: "high",
    derived: { is_hybrid_strategy: false },
    created_at: "2026-04-30T09:24:00Z",
    updated_at: "2026-04-30T09:24:00Z",
  },
  {
    id: "seg_008",
    document_id: "doc_demo",
    start: 491,
    end: 545,
    text: "拆房子後我們無處可住，租金補貼根本不夠租到同樣坪數的房子。",
    speaker: "私產權人 H",
    applied: [{ axis_id: "deep", code: "BE2" }],
    confidence: "medium",
    derived: { is_hybrid_strategy: false },
    created_at: "2026-04-30T09:26:00Z",
    updated_at: "2026-04-30T09:26:00Z",
  },
];

export const SAMPLE_DOCUMENT = {
  id: "doc_demo",
  name: "範例：都更公聽會逐字稿節錄.docx",
  uploaded_at: "2026-04-30T08:55:00Z",
  size_bytes: 28_440,
  page_count: 12,
  source_kind: "upload" as const,
  source_date: "2026-04-30",
  parsed_text:
    SAMPLE_SEGMENTS.map((s) => `【${s.speaker}】${s.text}`).join("\n\n") +
    "\n\n（…後續省略，完整逐字稿請於正式環境上傳）",
};
