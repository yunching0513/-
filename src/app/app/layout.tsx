import Link from "next/link";
import { ReactNode } from "react";
import {
  FileText,
  BookOpenText,
  Highlighter,
  BarChart3,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "總覽", icon: BarChart3, exact: true },
  { href: "/app/documents", label: "文件", icon: FileText },
  { href: "/app/codebook", label: "編碼簿", icon: BookOpenText },
  { href: "/app/coding", label: "編碼工作台", icon: Highlighter },
  { href: "/app/dashboard", label: "視覺化", icon: BarChart3 },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/" className="flex items-center">
            <Wordmark />
          </Link>
        </div>

        <div className="px-3 py-4">
          <ProjectSwitcher />
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-border px-2 py-3">
          <NavLink href="/app/settings" label="設定" icon={Settings} />
          <NavLink href="/app/help" label="使用說明" icon={HelpCircle} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
          <div className="text-sm text-muted-foreground">
            <span className="text-foreground">範例專案</span>
            <span className="mx-2">·</span>
            <span>都更公聽會分析</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              邀請協作者
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-deep_axis text-xs font-medium text-primary-foreground">
              YC
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

function ProjectSwitcher() {
  return (
    <button className="flex w-full items-center gap-2 rounded-lg border border-border bg-background p-2 text-left text-sm hover:bg-muted">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-surface_axis to-deep_axis text-[10px] font-bold text-primary-foreground">
        UR
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">都更公聽會分析</div>
        <div className="truncate text-[10px] text-muted-foreground">141 筆編碼 · 雙層</div>
      </div>
    </button>
  );
}
