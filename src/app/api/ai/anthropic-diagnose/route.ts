import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/ai/anthropic-diagnose
 *
 * Body (optional): { api_key }
 *
 * Calls Anthropic's `/v1/models` endpoint — the cheapest possible call that
 * doesn't require model access permission. If this returns 200, the key is
 * valid and the account works; if it returns 403, the account itself is
 * blocked (banned, unverified, no card, ToS issue). This separates "key /
 * model permission" from "account fully blocked".
 *
 * Also lists which specific models the key can see, so the user knows what
 * to actually pick.
 */
export async function POST(req: Request) {
  let api_key = "";
  try {
    const body = (await req.json().catch(() => ({}))) as { api_key?: string };
    if (body.api_key) api_key = body.api_key;
  } catch {
    /* noop */
  }
  if (!api_key) {
    api_key = process.env.ANTHROPIC_API_KEY ?? "";
  }
  if (!api_key) {
    return NextResponse.json({
      ok: false,
      stage: "config",
      message: "未提供 api_key，且伺服器未設 ANTHROPIC_API_KEY",
    });
  }

  // Anthropic /v1/models — only needs a valid key, no model access required
  let modelsRes: Response;
  try {
    modelsRes = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      stage: "network",
      message: `網路錯誤：${err instanceof Error ? err.message : String(err)}`,
      key_prefix: api_key.slice(0, 12) + "…",
    });
  }

  const rawBody = await modelsRes.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    /* keep raw */
  }

  if (modelsRes.status === 401) {
    return NextResponse.json({
      ok: false,
      stage: "key_invalid",
      title: "API key 完全無效",
      message: "key 無法通過 Anthropic 基本驗證 — 可能已撤銷或拼錯。請至 console.anthropic.com → Settings → API Keys 確認 / 重發。",
      key_prefix: api_key.slice(0, 12) + "…",
      status: 401,
    });
  }

  if (modelsRes.status === 403) {
    // Account-level block — even /v1/models doesn't work
    return NextResponse.json({
      ok: false,
      stage: "account_blocked",
      title: "你的 Anthropic 帳戶整體被擋",
      message:
        "連最基本的 /v1/models 都回 403 — 表示問題不在某個模型，而是整個帳戶。常見原因：" +
        "(1) 帳戶從未通過驗證（沒綁信用卡 + 身分驗證）" +
        "(2) Trial credits 耗盡且未升級付費 " +
        "(3) 帳戶因 ToS 被停用 " +
        "(4) Workspace 設為 Trust & Safety block 狀態",
      next_steps: [
        "到 console.anthropic.com 登入",
        "Plans & Billing → 看看是否被要求加信用卡",
        "Settings → Workspaces → 確認 workspace 未被停用",
        "若 1-3 都沒問題，到 support.anthropic.com 開 ticket 問為什麼帳戶被擋",
        "或：換成 Gemini / OpenAI / TAIDE — 你不一定要綁 Anthropic",
      ],
      key_prefix: api_key.slice(0, 12) + "…",
      status: 403,
      raw_body: rawBody.slice(0, 500),
    });
  }

  if (modelsRes.status === 200 && parsed && typeof parsed === "object") {
    // Key works at account level — list available models
    const data = parsed as { data?: { id: string; display_name?: string }[] };
    return NextResponse.json({
      ok: true,
      stage: "success",
      title: "你的 key 有效，帳戶正常",
      message: `成功取得 ${data.data?.length ?? 0} 個可用模型`,
      models: data.data?.map((m) => ({
        id: m.id,
        label: m.display_name ?? m.id,
      })),
      key_prefix: api_key.slice(0, 12) + "…",
      status: 200,
      next_steps: [
        "上面這些模型 ID 是你的 key 真正能用的",
        "回 Strata 設定頁，把模型改成這清單裡的任一個",
        "再按「測試連線」應該就會通",
      ],
    });
  }

  return NextResponse.json({
    ok: false,
    stage: "unknown",
    title: `Anthropic 回 HTTP ${modelsRes.status}`,
    message: rawBody.slice(0, 300),
    key_prefix: api_key.slice(0, 12) + "…",
    status: modelsRes.status,
  });
}
