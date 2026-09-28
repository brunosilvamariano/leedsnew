import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BizPeek",
    template: "%s | BizPeek",
  },
  description: "Plataforma inteligente de prospecção e gestão de oportunidades.",
  icons: {
    icon: "/logo/bizpeek-favicon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
import "./saas.css";
