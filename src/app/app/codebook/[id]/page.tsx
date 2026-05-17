"use client";

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { findBuiltinCodebook } from "@/lib/codebook/builtin";
import { useStrata } from "@/lib/store/strata";

export default function CodebookDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const userCodebooks = useStrata((s) => s.userCodebooks);
  const setCodebook = useStrata((s) => s.setCodebook);
  const addUserCodebook = useStrata((s) => s.addUserCodebook);
  const activeId = useStrata((s) => s.codebook_id);

  const codebook = findBuiltinCodebook(id) ?? userCodebooks.find((c) => c.codebook_id === id);
  if (!codebook) {
    notFound();
  }

  function copyAsUser() {
    const copy = {
      ...codebook!,
      codebook_id: `${codebook!.codebook_id}-copy-${Date.now()}`,
      name: `${codebook!.name}（複本）`,
    };
    addUserCodebook(copy);
    setCodebook(copy.codebook_id);
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(codebook, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${codebook!.codebook_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <Button asChild size="sm" variant="ghost" className="mb-2 -ml-2">
          <Link href="/app/codebook">
            <ArrowLeft className="h-4 w-4" />
            返回編碼簿庫
          </Link>
        </Button>
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{codebook.name}</h1>
              <Badge variant="outline">v{codebook.version}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{codebook.domain}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={downloadJson}>
              <Download className="h-4 w-4" />
              下載 JSON
            </Button>
            <Button variant="outline" onClick={copyAsUser}>
              複製為自訂版本
            </Button>
            {activeId === codebook.codebook_id ? (
              <Button asChild>
                <Link href="/app/coding">前往編碼工作台</Link>
              </Button>
            ) : (
              <Button onClick={() => setCodebook(codebook.codebook_id)}>套用此編碼簿</Button>
            )}
          </div>
        </div>
      </div>

      {codebook.description && (
        <Card>
          <CardContent className="p-6">
            <p className="leading-relaxed text-foreground">{codebook.description}</p>
            {codebook.source && (
              <p className="mt-2 text-xs text-muted-foreground">來源：{codebook.source}</p>
            )}
          </CardContent>
        </Card>
      )}

      {codebook.cot_workflow && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">編碼工作流程（Chain-of-Thought）</CardTitle>
            <CardDescription>AI 輔助時，將依此流程逐步引導</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {codebook.cot_workflow.map((step) => (
                <li key={step.step} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {step.step}
                  </div>
                  <div>
                    <div className="font-medium">{step.title}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{step.prompt}</div>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {codebook.axes.map((axis) => (
        <Card key={axis.axis_id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{axis.name}</CardTitle>
                {axis.theory_ref && (
                  <CardDescription className="mt-1 text-xs">{axis.theory_ref}</CardDescription>
                )}
              </div>
              <Badge
                variant={
                  axis.color_token === "surface_axis"
                    ? "surface"
                    : axis.color_token === "deep_axis"
                      ? "deep"
                      : "secondary"
                }
              >
                {axis.codes.length} 個編碼
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {axis.codes.map((code, i) => (
              <div key={code.code}>
                {i > 0 && <Separator className="my-4" />}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        axis.color_token === "surface_axis"
                          ? "surface"
                          : axis.color_token === "deep_axis"
                            ? "deep"
                            : "default"
                      }
                      className="font-mono"
                    >
                      {code.code}
                    </Badge>
                    <span className="font-medium">{code.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{code.definition}</p>
                  {code.trigger_conditions && code.trigger_conditions.length > 0 && (
                    <div className="mt-1">
                      <div className="text-xs font-medium text-foreground">觸發條件</div>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                        {code.trigger_conditions.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {code.exclusion_conditions && code.exclusion_conditions.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-foreground">排除條件</div>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                        {code.exclusion_conditions.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {code.examples && code.examples.length > 0 && (
                    <div className="mt-1 rounded-md bg-muted/40 p-3">
                      <div className="text-xs font-medium text-foreground">典型案例</div>
                      <ul className="mt-1 space-y-1 text-xs italic text-muted-foreground">
                        {code.examples.map((e, idx) => (
                          <li key={idx}>「{e}」</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {codebook.patterns && codebook.patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hybrid 模式樣板（{codebook.patterns.length}）</CardTitle>
            <CardDescription>表層 × 深層的典型交織模式，AI 將比對並建議匹配</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {codebook.patterns.map((p) => (
                <div
                  key={p.pattern_id}
                  className="rounded-lg border border-border bg-muted/20 p-4"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="hybrid">{p.name}</Badge>
                    {p.surface_code && (
                      <span className="text-xs font-mono text-surface_axis">
                        {p.surface_code}
                      </span>
                    )}
                    {p.deep_code && (
                      <>
                        <span className="text-xs text-muted-foreground">×</span>
                        <span className="text-xs font-mono text-deep_axis">{p.deep_code}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                  {p.example && (
                    <p className="mt-2 text-xs italic text-muted-foreground">例：{p.example}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {codebook.references && codebook.references.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <BookOpen className="mr-1 inline-block h-4 w-4" />
              參考文獻
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {codebook.references.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
