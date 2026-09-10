import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";
import { limitesDoDiaBrasil } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const orgId = await getOrgId();
  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get("inicio");
  const fim = searchParams.get("fim");

  if (!inicio || !fim) {
    return NextResponse.json({ erro: "Informe inicio e fim (YYYY-MM-DD)" }, { status: 400 });
  }

  const inicioIso = limitesDoDiaBrasil(inicio).inicio;
  const fimIso = limitesDoDiaBrasil(fim).fim;

  const [{ data: transacoes, error: transacoesError }, { data: despesas, error: despesasError }] =
    await Promise.all([
      supabaseAdmin
        .from("transactions")
        .select(
          "valor_cobrado, valor_produto, barber_id, forma_pagamento, cliente_nome, criado_em, users(nome), services(nome)"
        )
        .eq("org_id", orgId)
        .gte("criado_em", inicioIso)
        .lte("criado_em", fimIso),
      supabaseAdmin
        .from("expenses")
        .select("valor, categoria")
        .eq("org_id", orgId)
        .gte("data", inicio)
        .lte("data", fim),
    ]);

  if (transacoesError || despesasError) {
    return NextResponse.json(
      { erro: transacoesError?.message ?? despesasError?.message },
      { status: 500 }
    );
  }

  const pagas = (transacoes ?? []).filter((t) => t.forma_pagamento !== "cortesia");
  const cortesias = (transacoes ?? []).filter((t) => t.forma_pagamento === "cortesia");

  const entradas = pagas.reduce((soma, t) => soma + t.valor_cobrado + (t.valor_produto ?? 0), 0);
  const saidas = (despesas ?? []).reduce((soma, d) => soma + d.valor, 0);

  const porBarbeiro = new Map<string, { nome: string; total: number; quantidade: number }>();
  for (const t of pagas) {
    const nome = (t.users as unknown as { nome: string } | null)?.nome ?? "—";
    const atual = porBarbeiro.get(t.barber_id) ?? { nome, total: 0, quantidade: 0 };
    atual.total += t.valor_cobrado + (t.valor_produto ?? 0);
    atual.quantidade += 1;
    porBarbeiro.set(t.barber_id, atual);
  }

  const porCategoria = new Map<string, number>();
  for (const d of despesas ?? []) {
    porCategoria.set(d.categoria, (porCategoria.get(d.categoria) ?? 0) + d.valor);
  }

  return NextResponse.json({
    entradas,
    saidas,
    saldo: entradas - saidas,
    comparativoBarbeiros: Array.from(porBarbeiro.values()).sort((a, b) => b.total - a.total),
    despesasPorCategoria: Array.from(porCategoria.entries()).map(([categoria, total]) => ({
      categoria,
      total,
    })),
    cortesias: cortesias
      .map((t) => ({
        clienteNome: t.cliente_nome,
        servicoNome: (t.services as unknown as { nome: string } | null)?.nome ?? null,
        barbeiroNome: (t.users as unknown as { nome: string } | null)?.nome ?? null,
        criadoEm: t.criado_em,
      }))
      .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1)),
  });
}
