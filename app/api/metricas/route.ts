import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";
import { calcularComissao } from "@/lib/fechamento";

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

  const inicioIso = new Date(`${inicio}T00:00:00.000Z`).toISOString();
  const fimIso = new Date(`${fim}T23:59:59.999Z`).toISOString();

  const [{ data: atendimentos, error }, { data: comissao }] = await Promise.all([
    supabaseAdmin
      .from("transactions")
      .select("id, valor_cobrado, forma_pagamento, origem, cliente_nome, criado_em, services(nome)")
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

  const totalBruto = pagos.reduce((soma, a) => soma + a.valor_cobrado, 0);
  const totalComissao = calcularComissao(totalBruto, pagos.length, comissao);

  return NextResponse.json({
    quantidade: pagos.length,
    quantidadeCortesias: cortesias,
    totalBruto,
    totalComissao,
    atendimentos: atendimentos ?? [],
  });
}
