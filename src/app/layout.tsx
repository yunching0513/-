import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strata 層次分析 — 質性編碼研究平台",
  description:
    "為公聽會、聽證會等質性研究文本提供雙層編碼、AI 輔助標註、視覺化與 ATLAS.ti 匯出。",
  applicationName: "Strata",
  keywords: [
    "qualitative research",
    "qualitative data analysis",
    "QDA",
    "ATLAS.ti",
    "公聽會",
    "聽證會",
    "編碼簿",
    "質性研究",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
