import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";
import { calcularComissao } from "@/lib/fechamento";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await getOrgId();

  const { data: usuarios, error: usuariosError } = await supabaseAdmin
    .from("users")
    .select("id, nome, role")
    .eq("org_id", orgId)
    .eq("ativo", true)
    .order("nome");

  if (usuariosError) {
    return NextResponse.json({ erro: usuariosError.message }, { status: 500 });
  }

  const resumo = await Promise.all(
    usuarios.map(async (usuario) => {
      const [{ data: pendentes }, { data: comissao }] = await Promise.all([
        supabaseAdmin
          .from("transactions")
          .select("valor_cobrado, valor_produto, comissao_produto, forma_pagamento")
          .eq("org_id", orgId)
          .eq("barber_id", usuario.id)
          .is("closing_id", null),
        supabaseAdmin
          .from("commission_settings")
          .select("tipo, valor")
          .eq("org_id", orgId)
          .eq("barber_id", usuario.id)
          .order("vigente_desde", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const quantidade = (pendentes ?? []).filter((t) => t.forma_pagamento !== "cortesia").length;
      const totalBrutoServico = (pendentes ?? []).reduce((soma, t) => soma + t.valor_cobrado, 0);
      const totalBrutoProdutos = (pendentes ?? []).reduce((soma, t) => soma + (t.valor_produto ?? 0), 0);
      const totalComissaoProdutos = (pendentes ?? []).reduce(
        (soma, t) => soma + (t.comissao_produto ?? 0),
        0
      );
      const totalBruto = totalBrutoServico + totalBrutoProdutos;
      const totalComissao =
        calcularComissao(totalBrutoServico, quantidade, comissao) + totalComissaoProdutos;

      return { ...usuario, quantidade, totalBruto, totalComissao };
    })
  );

  const { data: pendentesPagamento, error: closingsError } = await supabaseAdmin
    .from("closings")
    .select("id, barber_id, periodo_inicio, periodo_fim, total_bruto, total_comissao, status, users(nome)")
    .eq("org_id", orgId)
    .eq("status", "pendente")
    .order("criado_em", { ascending: false });

  if (closingsError) {
    return NextResponse.json({ erro: closingsError.message }, { status: 500 });
  }

  return NextResponse.json({ resumo, pendentesPagamento });
}

export async function POST(request: Request) {
  const orgId = await getOrgId();
  const { barberId } = await request.json();

  if (typeof barberId !== "string") {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  const { data: abertos, error: abertosError } = await supabaseAdmin
    .from("transactions")
    .select("id, valor_cobrado, valor_produto, comissao_produto, forma_pagamento, criado_em")
    .eq("org_id", orgId)
    .eq("barber_id", barberId)
    .is("closing_id", null)
    .order("criado_em", { ascending: true });

  if (abertosError) {
    return NextResponse.json({ erro: abertosError.message }, { status: 500 });
  }

  if (!abertos || abertos.length === 0) {
    return NextResponse.json({ erro: "Nada pendente para fechar" }, { status: 400 });
  }

  const { data: comissao } = await supabaseAdmin
    .from("commission_settings")
    .select("tipo, valor")
    .eq("org_id", orgId)
    .eq("barber_id", barberId)
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .maybeSingle();

  const totalBrutoServico = abertos.reduce((soma, t) => soma + t.valor_cobrado, 0);
  const totalBrutoProdutos = abertos.reduce((soma, t) => soma + (t.valor_produto ?? 0), 0);
  const totalComissaoProdutos = abertos.reduce((soma, t) => soma + (t.comissao_produto ?? 0), 0);
  const totalBruto = totalBrutoServico + totalBrutoProdutos;
  const quantidadePaga = abertos.filter((t) => t.forma_pagamento !== "cortesia").length;
  const totalComissao =
    calcularComissao(totalBrutoServico, quantidadePaga, comissao) + totalComissaoProdutos;
  const periodoInicio = abertos[0].criado_em;
  const periodoFim = new Date().toISOString();

  const { data: closing, error: closingError } = await supabaseAdmin
    .from("closings")
    .insert({
      org_id: orgId,
      barber_id: barberId,
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      total_bruto: totalBruto,
      total_comissao: totalComissao,
      status: "pendente",
    })
    .select()
    .single();

  if (closingError) {
    return NextResponse.json({ erro: closingError.message }, { status: 500 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("transactions")
    .update({ closing_id: closing.id })
    .in(
      "id",
      abertos.map((t) => t.id)
    );

  if (updateError) {
    return NextResponse.json({ erro: updateError.message }, { status: 500 });
  }

  return NextResponse.json(closing, { status: 201 });
}
