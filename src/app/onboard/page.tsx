"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStrata } from "@/lib/store/strata";
import { BUILTIN_CODEBOOKS } from "@/lib/codebook/builtin";
import { Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;
type Provider = "anthropic" | "openai" | "gemini" | "taide";

const PROVIDERS: {
  id: Provider;
  name: string;
  flag?: string;
  cost: string;
  speed: string;
  hint: string;
  url: string;
  pros: string[];
  cons: string[];
  recommended?: boolean;
  keyHint: string;
}[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    cost: "免費 1500 次/天",
    speed: "30 秒申請",
    hint: "推薦給台灣使用者",
    url: "https://aistudio.google.com/apikey",
    pros: ["不用綁卡", "Google 帳號直接申請", "中文表現好"],
    cons: ["每日次數限制"],
    recommended: true,
    keyHint: "AIza...",
  },
  {
    id: "taide",
    name: "TAIDE",
    flag: "🇹🇼",
    cost: "學術免費",
    speed: "需 NCHC 帳號",
    hint: "國科會台灣本土繁中模型",
    url: "https://portal.genai.nchc.org.tw/",
    pros: ["台灣本土", "完全免費", "資料留台灣"],
    cons: ["需 iService 學術帳號", "模型較小（8B）", "推理較弱"],
    keyHint: "NCHC iService key",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    cost: "$5 試用後按量",
    speed: "5 分鐘申請",
    hint: "Chain-of-Thought 最強",
    url: "https://console.anthropic.com",
    pros: ["推理品質最高", "編碼簿 CoT 表現極好"],
    cons: ["必須綁卡", "免費額度小", "新模型授權嚴格"],
    keyHint: "sk-ant-...",
  },
  {
    id: "openai",
    name: "OpenAI",
    cost: "$5 試用後按量",
    speed: "5 分鐘申請",
    hint: "GPT 系列",
    url: "https://platform.openai.com/api-keys",
    pros: ["GPT 表現穩定", "生態最豐富"],
    cons: ["必須綁卡", "GPT-4o mini 推理一般"],
    keyHint: "sk-...",
  },
];

const DEFAULT_MODELS: Record<Provider, string> = {
  gemini: "gemini-2.5-flash",
  taide: "Llama3-TAIDE-LX-8B-Chat-Alpha1",
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  const provider = useStrata((s) => s.ai_provider);
  const setProvider = useStrata((s) => s.setAiProvider);
  const apiKey = useStrata((s) => s.ai_api_key);
  const setApiKey = useStrata((s) => s.setAiApiKey);
  const setCodebook = useStrata((s) => s.setCodebook);
  const setOnboardingComplete = useStrata((s) => s.setOnboardingComplete);
  const clearSampleData = useStrata((s) => s.clearSampleData);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [selectedCodebook, setSelectedCodebook] = useState(BUILTIN_CODEBOOKS[0].codebook_id);

  async function runTest() {
    if (!apiKey) return;
    setTesting(true);
    setTestResult(null);
    try {
      const { testDirect } = await import("@/lib/ai/client-direct");
      const { reply } = await testDirect({
        provider,
        api_key: apiKey,
        model: DEFAULT_MODELS[provider],
      });
      setTestResult({ ok: true, message: `連線成功（回應："${reply.slice(0, 30)}"）` });
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "未知錯誤",
      });
    } finally {
      setTesting(false);
    }
  }

  function finish(opts: { keepSample: boolean }) {
    setCodebook(selectedCodebook);
    setOnboardingComplete(true);
    if (!opts.keepSample) clearSampleData();
    router.push(opts.keepSample ? "/app/coding" : "/app/documents");
  }

  function skip() {
    setOnboardingComplete(true);
    router.push("/app");
  }

  const currentProvider = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-surface">
        <div className="container mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Wordmark />
          </Link>
          <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground">
            略過引導 →
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="container mx-auto max-w-5xl px-6 pt-8">
        <div className="flex items-center gap-3">
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="flex flex-1 items-center gap-3">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition",
                  step === n
                    ? "border-foreground bg-foreground text-background"
                    : step > n
                      ? "border-foreground bg-foreground/10 text-foreground"
                      : "border-border text-muted-foreground",
                )}
              >
                {step > n ? <Check className="h-3.5 w-3.5" /> : n}
              </div>
              <span
                className={cn(
                  "text-xs",
                  step === n ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {n === 1 ? "選 AI 供應商" : n === 2 ? "貼 API key" : "開始研究"}
              </span>
              {n < 3 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto max-w-5xl px-6 py-10">
        {step === 1 && (
          <section>
            <p className="eyebrow mb-2">第一步</p>
            <h1 className="text-2xl font-light tracking-tightish md:text-3xl">
              選一家 AI 供應商
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Strata 用 AI 加速質性編碼。你的 API key 只存在你瀏覽器的 localStorage，
              呼叫時直接從你瀏覽器送到供應商，不經 Strata 後端。
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={cn(
                    "border bg-surface p-5 text-left transition",
                    provider === p.id
                      ? "border-foreground/60 bg-muted/30 ring-1 ring-foreground/20"
                      : "border-border hover:border-foreground/30",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-medium tracking-tightish">
                        {p.name} {p.flag}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{p.hint}</p>
                    </div>
                    {p.recommended && <Badge variant="hybrid">推薦</Badge>}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">費用</div>
                      <div className="mt-0.5 font-medium">{p.cost}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">取得</div>
                      <div className="mt-0.5 font-medium">{p.speed}</div>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-1 text-xs">
                    {p.pros.map((s) => (
                      <li key={s} className="flex items-start gap-1.5">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-foreground/60" />
                        <span>{s}</span>
                      </li>
                    ))}
                    {p.cons.map((s) => (
                      <li key={s} className="flex items-start gap-1.5 text-muted-foreground">
                        <X className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <a
                href={currentProvider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-foreground underline-offset-2 hover:underline"
              >
                到「{currentProvider.name}」申請 key
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Button onClick={() => setStep(2)}>
                下一步：貼 key
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <p className="eyebrow mb-2">第二步</p>
            <h1 className="text-2xl font-light tracking-tightish md:text-3xl">
              貼上 {currentProvider.name} 的 API key
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              還沒有 key？前往{" "}
              <a
                href={currentProvider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline-offset-2 hover:underline"
              >
                {currentProvider.url.replace("https://", "")}
              </a>{" "}
              申請後再回來貼。
            </p>

            <div className="mt-8 space-y-5 border border-border bg-surface p-6">
              <div>
                <label className="eyebrow mb-2 block">API key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={currentProvider.keyHint}
                  className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  只存在你瀏覽器的 localStorage。不會傳到 Strata 後端。
                </p>
              </div>

              <Button
                onClick={runTest}
                disabled={!apiKey || testing}
                variant="outline"
                className="w-full"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {testing ? "測試中..." : "測試連線"}
              </Button>

              {testResult && (
                <div
                  className={cn(
                    "flex items-start gap-3 border p-3 text-sm",
                    testResult.ok
                      ? "border-foreground/20 bg-muted/30"
                      : "border-destructive/30 bg-destructive/5",
                  )}
                >
                  {testResult.ok ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div
                      className={
                        testResult.ok ? "font-medium" : "font-medium text-destructive"
                      }
                    >
                      {testResult.ok ? "✓ 通了" : "✗ 失敗"}
                    </div>
                    <div className="mt-1 text-xs text-foreground/80 break-words">
                      {testResult.message}
                    </div>
                    {!testResult.ok && (
                      <button
                        onClick={() => setStep(1)}
                        className="mt-2 text-xs text-foreground underline-offset-2 hover:underline"
                      >
                        ← 換一家供應商
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> 上一步
              </Button>
              <Button onClick={() => setStep(3)} disabled={!apiKey}>
                {testResult?.ok ? "下一步" : "略過測試繼續"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <p className="eyebrow mb-2">第三步</p>
            <h1 className="text-2xl font-light tracking-tightish md:text-3xl">
              選編碼簿，然後就完成了
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              編碼簿決定你怎麼分析文本。你之後也可以匯入自己的、或在編碼簿庫切換。
            </p>

            <div className="mt-8 space-y-3">
              {BUILTIN_CODEBOOKS.map((cb) => (
                <button
                  key={cb.codebook_id}
                  onClick={() => setSelectedCodebook(cb.codebook_id)}
                  className={cn(
                    "block w-full border bg-surface p-5 text-left transition",
                    selectedCodebook === cb.codebook_id
                      ? "border-foreground/60 bg-muted/30 ring-1 ring-foreground/20"
                      : "border-border hover:border-foreground/30",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-medium tracking-tightish">{cb.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{cb.domain}</p>
                    </div>
                    {selectedCodebook === cb.codebook_id && (
                      <Check className="h-4 w-4 text-foreground" />
                    )}
                  </div>
                  {cb.description && (
                    <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                      {cb.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {cb.axes.map((a) => (
                      <Badge
                        key={a.axis_id}
                        variant={
                          a.color_token === "surface_axis"
                            ? "surface"
                            : a.color_token === "deep_axis"
                              ? "deep"
                              : "secondary"
                        }
                      >
                        {a.name.replace(/^[^：]+：/, "")}
                      </Badge>
                    ))}
                    {cb.patterns && cb.patterns.length > 0 && (
                      <Badge variant="hybrid">{cb.patterns.length} 種 Hybrid 模式</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" /> 上一步
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => finish({ keepSample: true })}>
                  先看示範資料
                </Button>
                <Button onClick={() => finish({ keepSample: false })}>
                  清掉示範，從我自己的文件開始
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
