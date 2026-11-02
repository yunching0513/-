"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useStrata,
  useActiveCodebook,
  useActiveDocument,
  useActiveSegments,
} from "@/lib/store/strata";
import { downloadExcel, downloadQdpx } from "@/lib/export/client";

interface AiTestResult {
  ok: boolean;
  stage: string;
  message: string;
  provider?: string;
  model?: string;
  reply?: string;
  status?: number;
  raw?: string;
  key_prefix?: string;
}

export default function SettingsPage() {
  const segments = useActiveSegments();
  const document = useActiveDocument();
  const cb = useActiveCodebook();

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);

  const aiProvider = useStrata((s) => s.ai_provider);
  const aiApiKey = useStrata((s) => s.ai_api_key);
  const aiModel = useStrata((s) => s.ai_model);

  async function runAiTest() {
    setTesting(true);
    setTestResult(null);
    try {
      // Client-direct path for ALL providers when user has BYO key.
      // Bypasses Strata's backend entirely (privacy + region + Tauri compat).
      if (aiApiKey) {
        const { testDirect } = await import("@/lib/ai/client-direct");
        const defaults: Record<string, string> = {
          anthropic: "claude-haiku-4-5-20251001",
          openai: "gpt-4o-mini",
          gemini: "gemini-2.5-flash",
          taide: "Llama3-TAIDE-LX-8B-Chat-Alpha1",
        };
        const model = aiModel || defaults[aiProvider];
        try {
          const { reply } = await testDirect({
            provider: aiProvider,
            api_key: aiApiKey,
            model,
          });
          setTestResult({
            ok: true,
            stage: "success",
            message:
              "AI 連線正常（直接從你的瀏覽器呼叫供應商，繞過 Strata 後端，私密且不受 region 限制）",
            provider: aiProvider,
            model,
            reply: reply.slice(0, 50),
            key_prefix: aiApiKey.slice(0, 12) + "…",
          });
        } catch (err) {
          setTestResult({
            ok: false,
            stage: "unknown",
            message: err instanceof Error ? err.message : "未知錯誤",
            provider: aiProvider,
            model,
            key_prefix: aiApiKey.slice(0, 12) + "…",
          });
        }
        return;
      }

      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          api_key: aiApiKey || undefined,
          model: aiModel || undefined,
        }),
      });
      const data = (await res.json()) as AiTestResult;
      setTestResult(data);
    } catch (err) {
      setTestResult({
        ok: false,
        stage: "network",
        message: err instanceof Error ? err.message : "網路錯誤",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-8 p-10">
      <header>
        <p className="eyebrow mb-2">設定</p>
        <h1 className="text-3xl font-light tracking-tightish">帳戶與專案</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          AI 模型、用量、資料匯出。
        </p>
      </header>

      <AiProviderCard />


      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">AI 連線測試</CardTitle>
              <CardDescription>
                直接 ping Anthropic API 一次，診斷 API key、權限、計費狀態
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={runAiTest} disabled={testing}>
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {testing ? "測試中..." : "測試連線"}
            </Button>
          </div>
        </CardHeader>
        {testResult && (
          <CardContent>
            <div
              className={
                "flex items-start gap-3 border p-4 text-sm " +
                (testResult.ok
                  ? "border-foreground/20 bg-muted/30"
                  : "border-destructive/30 bg-destructive/5")
              }
            >
              {testResult.ok ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-foreground/70" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div
                  className={
                    "font-medium " + (testResult.ok ? "" : "text-destructive")
                  }
                >
                  {testResult.ok ? "✓ 連線成功" : "✗ 連線失敗"}
                  {testResult.status && (
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      HTTP {testResult.status}
                    </span>
                  )}
                  {testResult.stage && testResult.stage !== "success" && (
                    <Badge variant="outline" className="ml-2">
                      {stageLabel(testResult.stage)}
                    </Badge>
                  )}
                </div>
                <p className="break-words text-foreground/85">{testResult.message}</p>
                {testResult.ok && testResult.reply && (
                  <p className="text-xs text-muted-foreground">
                    模型：<span className="font-mono">{testResult.model}</span>　·　回應：
                    <span className="italic">"{testResult.reply}"</span>
                  </p>
                )}
                {testResult.key_prefix && (
                  <p className="text-xs text-muted-foreground">
                    使用的 key：<span className="font-mono">{testResult.key_prefix}</span>
                  </p>
                )}
                {!testResult.ok && testResult.raw && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">
                      原始錯誤訊息
                    </summary>
                    <pre className="mt-1 overflow-x-auto rounded-sm bg-muted p-2 font-mono">
                      {testResult.raw}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">本月 AI 用量</CardTitle>
          <CardDescription>
            用量由各 AI 供應商自行計帳，請至該供應商 console 查詢
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <p>
            Strata 本身不對 AI 使用收費。費用直接記在你在 settings 設定的供應商
            帳戶下（Anthropic / OpenAI / Gemini Free tier 通常零費用，TAIDE 學術免費）。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">資料匯出</CardTitle>
          <CardDescription>
            匯出當前專案的 {segments.length} 個編碼片段
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            variant="outline"
            disabled={segments.length === 0}
            onClick={() => downloadExcel(segments, cb, document.name)}
          >
            下載 Excel (.xlsx)
          </Button>
          <Button
            disabled={segments.length === 0}
            onClick={() => downloadQdpx(segments, cb, document)}
          >
            下載 ATLAS.ti (.qdpx)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AiProviderCard() {
  const provider = useStrata((s) => s.ai_provider);
  const setProvider = useStrata((s) => s.setAiProvider);
  const apiKey = useStrata((s) => s.ai_api_key);
  const setApiKey = useStrata((s) => s.setAiApiKey);
  const model = useStrata((s) => s.ai_model);
  const setModel = useStrata((s) => s.setAiModel);
  const [showKey, setShowKey] = useState(false);

  const providers = [
    {
      id: "anthropic" as const,
      name: "Anthropic Claude",
      models: [
        { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5（推薦）" },
        { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
        { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
        { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
      ],
      consoleUrl: "https://console.anthropic.com",
      consoleLabel: "console.anthropic.com",
      keyHint: "sk-ant-…",
      note:
        "貼 key 後會直接從你的瀏覽器呼叫 Anthropic（不經 Strata 後端）。" +
        "務必貼自己的 key — Strata 伺服器位於香港，Anthropic 封鎖該地區的呼叫。" as
        | string
        | null,
    },
    {
      id: "openai" as const,
      name: "OpenAI",
      models: [
        { id: "gpt-4o-mini", label: "GPT-4o mini（推薦）" },
        { id: "gpt-4o", label: "GPT-4o" },
        { id: "gpt-4.1", label: "GPT-4.1" },
      ],
      consoleUrl: "https://platform.openai.com/api-keys",
      consoleLabel: "platform.openai.com",
      keyHint: "sk-…",
      note: null,
    },
    {
      id: "gemini" as const,
      name: "Google Gemini",
      models: [
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash（推薦）" },
        { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
        { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      ],
      consoleUrl: "https://aistudio.google.com/apikey",
      consoleLabel: "aistudio.google.com",
      keyHint: "AIza…",
      note:
        "貼 key 後會直接從你的瀏覽器呼叫 Google，繞過 Strata 後端 — " +
        "因為 Vercel Hobby 鎖死部署在香港，而 Google 不支援香港 IP。",
    },
    {
      id: "taide" as const,
      name: "TAIDE 🇹🇼",
      models: [
        {
          id: "Llama3-TAIDE-LX-8B-Chat-Alpha1",
          label: "Llama3-TAIDE-LX-8B-Chat（推薦）",
        },
        {
          id: "Llama3-TAIDE-LX-8B-Instruct-Alpha1",
          label: "Llama3-TAIDE-LX-8B-Instruct",
        },
      ],
      consoleUrl: "https://portal.genai.nchc.org.tw/",
      consoleLabel: "portal.genai.nchc.org.tw",
      keyHint: "NCHC iService API key",
      note: "台灣本土繁中模型（國科會 TAIDE 計畫）。需 NCHC iService 帳號申請。模型較小（8B），適合輔助但 CoT 推理可能不如商用大模型。",
    },
  ];

  const current = providers.find((p) => p.id === provider) ?? providers[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI 供應商與 API key</CardTitle>
        <CardDescription>
          自己貼 key 走自己的帳號 — 你的 key 只存於本機瀏覽器（localStorage），
          僅在請求時隨 body 送往 Strata 後端，由後端轉發給該供應商。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="eyebrow mb-2">供應商</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={
                  "rounded-sm border px-3 py-2.5 text-left text-sm transition " +
                  (provider === p.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-muted/40")
                }
              >
                <div className="font-medium">{p.name}</div>
                <div
                  className={
                    "truncate text-[10px] " +
                    (provider === p.id ? "text-background/70" : "text-muted-foreground")
                  }
                >
                  {p.consoleLabel}
                </div>
              </button>
            ))}
          </div>
          {current.note && (
            <p className="mt-2 border-l-2 border-foreground/20 pl-2 text-[11px] text-muted-foreground">
              {current.note}
            </p>
          )}
        </div>

        <div>
          <div className="eyebrow mb-2">API key</div>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`貼上你的 ${current.name} key — ${current.keyHint}`}
              className="flex-1 rounded-sm border border-border bg-surface px-3 py-2 font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKey(!showKey)}
              className="shrink-0"
            >
              {showKey ? "隱藏" : "顯示"}
            </Button>
            {apiKey && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setApiKey("")}
                className="shrink-0"
              >
                清除
              </Button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            還沒有 key？前往{" "}
            <a
              href={current.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {current.consoleLabel}
            </a>{" "}
            申請（多數供應商 Free tier 即可用 default 模型）。
            留空則會回退到伺服器預設 key（若部署者有設）。
          </p>
        </div>

        <div>
          <div className="eyebrow mb-2">模型</div>
          <select
            value={model || current.models[0].id}
            onChange={(e) => setModel(e.target.value)}
            className="h-9 w-full max-w-md rounded-sm border border-border bg-surface px-3 text-sm"
          >
            {current.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            建議使用該供應商的最小／最快模型（標示「推薦」者）— 適合質性研究且成本最低。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function stageLabel(stage: string): string {
  switch (stage) {
    case "config":
      return "設定問題";
    case "key":
      return "Key 無效";
    case "billing":
      return "帳單問題";
    case "permission":
      return "模型權限";
    case "rate":
      return "速率限制";
    case "overload":
      return "服務過載";
    case "upstream":
      return "上游錯誤";
    case "network":
      return "網路錯誤";
    default:
      return stage;
  }
}

