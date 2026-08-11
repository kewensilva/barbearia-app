import type { Metadata } from "next";
import "./globals.css";
import InactivityGuard from "./components/InactivityGuard";

export const metadata: Metadata = {
  title: "Fluxo de Caixa - Barbearia",
  description: "Gestão de caixa, comissão e despesas da barbearia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <InactivityGuard />
        {children}
      </body>
    </html>
  );
}
