import type { Codebook } from "../types";

/**
 * Built-in codebook: 雙層編碼簿 v3.0｜程序正義 × 行為經濟學
 *
 * Source: User-provided codebook for analyzing public hearing / testimony
 * discourse in urban renewal cases. Encodes 4 procedural-justice categories
 * (surface) and 5 behavioral-economics bias categories (deep), plus 7
 * empirically-derived hybrid patterns.
 *
 * References: Tyler (2003); Tversky & Kahneman (1973, 1974, 1981, 1991);
 * Kahneman & Tversky (1979); Lord, Ross & Lepper (1979); Thaler (1980, 1985).
 */
export const dualLayerPJxBE: Codebook = {
  codebook_id: "dual-layer-pj-be-v3",
  name: "雙層編碼簿 v3.0｜程序正義 × 行為經濟學",
  domain: "都市更新／公聽會論述分析",
  version: "3.0",
  methodology: "multi_axis",
  description:
    "雙層平行編碼框架。表層為居民訴諸的程序正義類別，深層為驅動論述的行為經濟學偏誤；當二者皆觸發即構成 Hybrid 策略（以程序語言包裝心理偏誤）。",
  source: "回溯整理 2026-05-03，對應 coded_hybrid_final.pkl（141 筆）",
  authors: ["雙層編碼簿 v3.0"],

  axes: [
    {
      axis_id: "surface",
      name: "表層：程序正義訴求",
      description: "Tyler (2003) 程序正義四面向：聲音表達、中立性、可信任性、尊重",
      theory_ref: "Tyler, T. R. (2003). Procedural justice, legitimacy, and the effective rule of law. Crime and Justice, 30: 283–357.",
      color_token: "surface_axis",
      cardinality: "exclusive",
      codes: [
        {
          code: "PJ1",
          name: "程序不正義",
          definition:
            "對程序本身之公平性、合法性、可參與性之質疑。包括聲音表達不足、中立性質疑、未受充分尊重等。",
          trigger_conditions: [
            "質疑公聽會／聽證會之召開時程、通知方式、發言機制",
            "主張未獲充分表達意見之機會",
            "質疑審議委員會之中立性",
            "質疑市府／實施者之程序合法性",
          ],
          exclusion_conditions: [
            "純粹詢問程序步驟（無質疑）→ UNCODED-U1",
            "對技術細節之合理質疑（如估價方法）→ 應改判為「資訊揭露不足」",
          ],
          examples: [
            "我們居民根本沒被通知就要拆房子，這是什麼程序",
            "公聽會明明還沒開完，怎麼就送都委會",
            "事業計畫核定後居民就無法再表達意見",
          ],
        },
        {
          code: "PJ2",
          name: "分配與比較性不公",
          definition:
            "訴諸分配結果之不公平，常涉及與他人、其他案件、不同方案版本之比較。",
          trigger_conditions: [
            "援引其他居民之分配結果作為比較基準",
            "援引其他都更案之分配條件作為比較基準",
            "援引同案不同方案版本之差異作為論述基礎",
            "訴諸「同案應同酬」「不應差別待遇」之分配主張",
          ],
          exclusion_conditions: [
            "純粹詢問分配計算方式（無比較主張）→ UNCODED-U2",
            "對絕對數值之不滿（無比較對象）→ 應視語境改判為損失厭避或 UNCODED",
          ],
          examples: [
            "永和大陳一坪換五坪，怎麼我們連兩坪都不到",
            "109 年方案比 110 年方案多 20 萬",
            "為什麼 1F 的權值比 2F 高那麼多",
          ],
        },
        {
          code: "PJ3",
          name: "實施者不信任",
          definition: "對實施者（市府、都更中心、營建公司）之誠信、能力、動機之質疑或指控。",
          trigger_conditions: [
            "指控實施者違反先前承諾",
            "指控實施者圖利、剝削、自肥",
            "質疑實施者之專業能力",
            "對實施者態度之不滿（傲慢、敷衍等）",
          ],
          exclusion_conditions: [
            "純粹質疑特定行政決定（無誠信指控）→ UNCODED-U3",
            "對單一程序步驟之質疑（無對人質疑）→ 應改判為「程序不正義」",
          ],
          examples: [
            "林洲民承諾的條件，現在都不算數",
            "華鼎涉嫌偷工減料、容積灌水",
            "執政者不能這麼傲慢",
          ],
        },
        {
          code: "PJ4",
          name: "資訊揭露不足",
          definition:
            "對實施者／市府未充分揭露關鍵資訊之質疑，主張因資訊不對稱而無法做出明智決策。",
          trigger_conditions: [
            "主張關鍵資訊未公開（估價方法、權變細節、建商背景等）",
            "質疑提供之資訊不完整或誤導",
            "要求補充說明特定數據／計算",
            "對「黑箱」「不透明」之指控",
          ],
          exclusion_conditions: [
            "已獲充分回應而仍重複質問 → 改判深層（確認偏誤）",
            "對非關鍵細節之查詢（無實質影響）→ UNCODED",
          ],
          examples: [
            "48% 共同負擔比是怎麼算出來的，請說明",
            "估價師依據什麼法規，請公開資料",
            "建商背景、財務狀況都應該公開",
          ],
        },
      ],
    },

    {
      axis_id: "deep",
      name: "深層：行為經濟學偏誤",
      description: "Tversky & Kahneman 與相關研究之心理偏誤，作為驅動論述的深層機制",
      theory_ref:
        "Tversky & Kahneman (1973, 1974, 1981, 1991); Kahneman & Tversky (1979); Thaler (1980, 1985); Lord, Ross & Lepper (1979).",
      color_token: "deep_axis",
      cardinality: "exclusive",
      codes: [
        {
          code: "BE1",
          name: "定錨效應",
          definition:
            "決策受到「第一個出現的數字／價格」強烈影響，並以此作為後續比較的絕對標準。",
          trigger_conditions: [
            "文本中出現具體比較基準數字（歷史錨點、外部錨點、期待錨點）",
            "此基準被用來衡量、批評或要求修正當前方案",
          ],
          examples: [
            "109 年方案是 1.8 倍容積，今年變 2 倍（歷史錨點）",
            "永和大陳一坪換五坪（外部錨點）",
            "林洲民承諾的內容（期待錨點）",
          ],
        },
        {
          code: "BE2",
          name: "損失厭避",
          definition:
            "對於失去／改變的痛苦遠大於獲得的快樂，且此心理機制驅動其決策。雙層編碼採較寬鬆判讀，將「對失去之擔憂」皆納入考量。",
          trigger_conditions: [
            "對特定失去（財產、確定性、居住延續、鄰里）之強烈擔憂",
            "此擔憂遠超過對應獲益之描述",
          ],
          examples: ["拆房子後我們無處可住", "核定後我們就沒有發言權了"],
        },
        {
          code: "BE3",
          name: "稟賦效應",
          definition:
            "對於自己已擁有之物品或權益之主觀價值評價，明顯高於市場客觀估值。",
          trigger_conditions: [
            "強調自有房屋／土地之「特殊價值」「無法替代性」",
            "此主觀價值論述基礎為「我擁有」之事實本身",
          ],
          examples: ["我這個一樓店面比較有價值", "我們這層的視野不一樣"],
        },
        {
          code: "BE4",
          name: "框架效應",
          definition: "相同資訊以不同方式表達，使人們系統性產生不同反應。",
          trigger_conditions: [
            "施框架方：有意以特定包裝引導他人決策",
            "被框架方：明顯被特定包裝影響並以此理解事物",
          ],
          examples: [
            "48% 共同負擔比是『保守提列』（施框架）",
            "這是『更新前的價值』所以拒絕現金選項（被框架）",
          ],
        },
        {
          code: "BE5",
          name: "直覺捷徑與確認偏誤",
          definition:
            "包含可得性捷思、代表性捷思、確認偏誤之合併類別。共同特徵為「以印象、刻板印象或既定立場處理證據」。",
          trigger_conditions: [
            "可得性捷思：以特定事件／案例／新聞作為論述基礎，並推論至一般性結論",
            "代表性捷思：以刻板印象標籤推論群體特性",
            "確認偏誤：對相反證據以陰謀論、選擇性否定處理",
          ],
          examples: [
            "斯文里三期蓋好給我們看，缺點很多（可得性）",
            "社會住宅都是龍蛇混雜（代表性）",
            "估價師都被建商收買（確認偏誤）",
          ],
        },
      ],
    },
  ],

  derived_codes: [
    {
      code: "is_hybrid_strategy",
      name: "Hybrid 策略",
      description:
        "當論述同時觸發某一表層類別 AND 某一深層類別，即視為以程序語言包裝心理偏誤之 Hybrid 策略。",
      rule: "axis:surface != null AND axis:deep != null",
      type: "boolean",
    },
  ],

  patterns: [
    {
      pattern_id: "anchor_defense",
      name: "錨點防衛模式",
      surface_code: "PJ2",
      deep_code: "BE1",
      description:
        "以「比別人少」之分配公平訴求為表層，實質鎖定於特定歷史／外部錨點。",
      example: "永和大陳援引、109 vs 110 年方案、內政部 200:106 標準",
      theoretical_implication: "「分配公平」常為「歷史錨點」之修辭包裝",
    },
    {
      pattern_id: "promise_anchoring",
      name: "承諾錨點化模式",
      surface_code: "PJ3",
      deep_code: "BE1",
      description:
        "以「實施者違反承諾」之誠信質疑為表層，實質鎖定於該歷史承諾形成的期待錨點。",
      example: "「駐點承諾去年方案」、「林洲民當初的承諾」",
      theoretical_implication: "方案變更被誤判為誠信違反，因期待已被先前承諾錨定",
    },
    {
      pattern_id: "conspiracy_interpretation",
      name: "陰謀詮釋模式",
      surface_code: "PJ3",
      deep_code: "BE5",
      description:
        "以「圖利／剝削／自肥」之誠信指控為表層，實質為對相反證據之選擇性否定。",
      example: "「拿缺工當藉口」、「容積灌水」、「圖利特定樓層」",
      theoretical_implication: "呼應 Lord et al. (1979) 信念極化下相反證據強化既有立場",
    },
    {
      pattern_id: "endowment_defense",
      name: "稟賦防衛模式",
      surface_code: "PJ2",
      deep_code: "BE3",
      description: "以「分配不公」訴求為表層，實質為對自有資產特殊價值之稟賦防衛。",
      example: "1F 商戶要求公設樓層差價一致、邊間特殊價值主張",
      theoretical_implication: "稟賦效應透過分配公平語言獲得正當性",
    },
    {
      pattern_id: "comparison_impression",
      name: "比較印象模式",
      surface_code: "PJ2",
      deep_code: "BE5",
      description:
        "以「比較案例」訴諸分配不公，實質為印象深刻鄰近案例之高可得性。",
      example: "「三期已蓋好給我們看」、「別的地方跑得比我們快」",
      theoretical_implication: "跨案比較訴求受案例可得性高度影響",
    },
    {
      pattern_id: "procedural_lifesaving",
      name: "程序救命模式",
      surface_code: "PJ1",
      deep_code: "BE2",
      description:
        "以「程序加速」之程序訴求為表層，實質為對失去（生命危險、危屋崩塌）之強烈恐懼。",
      example: "房屋鋼筋外露搖搖欲墜，懇求快速拆屋",
      theoretical_implication: "唯一支持都更之 Hybrid 模式",
    },
    {
      pattern_id: "loss_attribution",
      name: "失去歸責模式",
      surface_code: "PJ3",
      deep_code: "BE2",
      description:
        "以「實施者造成損失」之誠信指控為表層，實質為對特定失去之歸因策略。",
      example: "實施者讓我們失去原有租金收入",
      theoretical_implication: "損失厭避透過「對人歸責」獲得情感正當性",
    },
  ],

  cot_workflow: [
    {
      step: 1,
      title: "理解論述語境",
      prompt:
        "辨識：發言者身分（私產權人／實施者／議員／市府代表／其他）、主要訴求內容、訴求類型（程序質疑／分配不滿／誠信指控／技術詢問）。",
    },
    {
      step: 2,
      title: "判讀表層（程序正義訴求）",
      prompt:
        "對照 PJ1–PJ4 的觸發條件。無觸發 → 表層 = 無；單一觸發 → 標記該類別；多重觸發 → 取最主要，於 Memo 註明次要。",
    },
    {
      step: 3,
      title: "判讀深層（行為經濟學偏誤）",
      prompt:
        "對照 BE1–BE5 的觸發條件。無觸發 → 深層 = 無；單一觸發 → 標記該類別；多重觸發 → 取最主要，於 Memo 註明次要。",
    },
    {
      step: 4,
      title: "判定 Hybrid 策略",
      prompt: "若表層 ≠ 無 且 深層 ≠ 無，則 is_hybrid_strategy = True。",
    },
    {
      step: 5,
      title: "撰寫交織剖析（50–150 字）",
      prompt:
        "說明：（1）表層程序爭議的具體內容；（2）深層心理偏誤如何驅動該爭議；（3）二者「策略性結合」之具體機制。",
    },
  ],

  annotations: {
    memo: true,
    confidence: true,
    interweaving_analysis: { min_chars: 50, max_chars: 150 },
  },

  references: [
    "Tyler, T. R. (2003). Procedural justice, legitimacy, and the effective rule of law. Crime and Justice, 30: 283–357.",
    "Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. Science, 185(4157), 1124–1131.",
    "Tversky, A., & Kahneman, D. (1981). The framing of decisions and the psychology of choice. Science, 211(4481), 453–458.",
    "Kahneman, D., & Tversky, A. (1979). Prospect theory: An analysis of decision under risk. Econometrica, 47(2), 263–291.",
    "Lord, C. G., Ross, L., & Lepper, M. R. (1979). Biased assimilation and attitude polarization. Journal of Personality and Social Psychology, 37(11), 2098–2109.",
    "Thaler, R. (1980). Toward a positive theory of consumer choice. Journal of Economic Behavior & Organization, 1(1), 39–60.",
  ],
};
