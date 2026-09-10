import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";
import { calcularComissao } from "@/lib/fechamento";
import { limitesDoDiaBrasil } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const orgId = await getOrgId();
  const { searchParams } = new URL(request.url);
  const usuarioId = searchParams.get("usuario");
  const inicio = searchParams.get("inicio");
  const fim = searchParams.get("fim");

  if (!usuarioId || !inicio || !fim) {
    return NextResponse.json({ erro: "Informe usuario, inicio e fim" }, { status: 400 });
  }

  const inicioIso = limitesDoDiaBrasil(inicio).inicio;
  const fimIso = limitesDoDiaBrasil(fim).fim;

  const [{ data: atendimentos, error }, { data: comissao }] = await Promise.all([
    supabaseAdmin
      .from("transactions")
      .select(
        "id, valor_cobrado, valor_produto, comissao_produto, forma_pagamento, origem, cliente_nome, criado_em, services(nome), products(nome)"
      )
      .eq("org_id", orgId)
      .eq("barber_id", usuarioId)
      .gte("criado_em", inicioIso)
      .lte("criado_em", fimIso)
      .order("criado_em", { ascending: false }),
    supabaseAdmin
      .from("commission_settings")
      .select("tipo, valor")
      .eq("org_id", orgId)
      .eq("barber_id", usuarioId)
      .order("vigente_desde", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  const pagos = (atendimentos ?? []).filter((a) => a.forma_pagamento !== "cortesia");
  const cortesias = (atendimentos ?? []).length - pagos.length;

  const totalBrutoServico = pagos.reduce((soma, a) => soma + a.valor_cobrado, 0);
  const totalBrutoProdutos = pagos.reduce((soma, a) => soma + (a.valor_produto ?? 0), 0);
  const totalComissaoProdutos = pagos.reduce((soma, a) => soma + (a.comissao_produto ?? 0), 0);
  const totalBruto = totalBrutoServico + totalBrutoProdutos;
  const totalComissao = calcularComissao(totalBrutoServico, pagos.length, comissao) + totalComissaoProdutos;

  return NextResponse.json({
    quantidade: pagos.length,
    quantidadeCortesias: cortesias,
    totalBruto,
    totalComissao,
    atendimentos: atendimentos ?? [],
  });
}
