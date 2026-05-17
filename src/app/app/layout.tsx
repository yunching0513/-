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
import { DocumentSwitcher } from "@/components/app/document-switcher";
import { Topbar } from "@/components/app/topbar";
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
          <DocumentSwitcher />
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
        <Topbar />
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

