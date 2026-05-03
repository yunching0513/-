import Link from "next/link";
import { ArrowRight, Upload, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BUILTIN_CODEBOOKS } from "@/lib/codebook/builtin";

export default function CodebookLibraryPage() {
  return (
    <div className="space-y-6 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">編碼簿</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            選擇內建編碼簿，或匯入你自己的（支援 JSON、CSV、REFI-QDA）。
          </p>
        </div>
        <Button>
          <Upload className="h-4 w-4" />
          匯入編碼簿
        </Button>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">內建編碼簿</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {BUILTIN_CODEBOOKS.map((cb) => {
            const totalCodes = cb.axes.reduce((sum, a) => sum + a.codes.length, 0);
            return (
              <Link key={cb.codebook_id} href={`/app/codebook/${cb.codebook_id}`}>
                <Card className="transition hover:border-primary/30 hover:shadow-glow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{cb.name}</CardTitle>
                        <CardDescription className="mt-1">{cb.domain}</CardDescription>
                      </div>
                      <Badge variant="outline">v{cb.version}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{cb.description}</p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" /> {cb.axes.length} 軸
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" /> {totalCodes} 編碼
                      </span>
                      {cb.patterns && cb.patterns.length > 0 && (
                        <Badge variant="hybrid" className="ml-auto">
                          {cb.patterns.length} 個 Hybrid 模式
                        </Badge>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
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
                            {a.name.replace(/^[^：]+：/, "") || a.name}
                          </Badge>
                        ))}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="pt-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">你的編碼簿</h2>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              尚未建立自訂編碼簿。點擊右上「匯入編碼簿」上傳，或從內建編碼簿複製為起點。
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
