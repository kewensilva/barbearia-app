import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

async function buscarAtendimentoAberto(orgId: string, id: string) {
  const { data: atendimento } = await supabaseAdmin
    .from("transactions")
    .select("id, service_id, closing_id")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  return atendimento;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const orgId = await getOrgId();
  const { servicoId, formaPagamento, origem, clienteNome, valorCobrado } = await request.json();

  if (
    typeof servicoId !== "string" ||
    !["dinheiro", "pix", "cartao", "cortesia"].includes(formaPagamento) ||
    !["agendado", "encaixe"].includes(origem) ||
    (clienteNome !== undefined && typeof clienteNome !== "string") ||
    typeof valorCobrado !== "number" ||
    valorCobrado < 0
  ) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  if (formaPagamento === "cortesia" && !clienteNome?.trim()) {
    return NextResponse.json(
      { erro: "Informe o nome do cliente para registrar a cortesia" },
      { status: 400 }
    );
  }

  const atendimento = await buscarAtendimentoAberto(orgId, params.id);
  if (!atendimento) {
    return NextResponse.json({ erro: "Atendimento não encontrado" }, { status: 404 });
  }
  if (atendimento.closing_id) {
    return NextResponse.json(
      { erro: "Este atendimento já foi fechado e não pode mais ser alterado" },
      { status: 400 }
    );
  }

  const { data: servico, error: servicoError } = await supabaseAdmin
    .from("services")
    .select("id")
    .eq("id", servicoId)
    .eq("org_id", orgId)
    .single();

  if (servicoError || !servico) {
    return NextResponse.json({ erro: "Serviço não encontrado" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .update({
      service_id: servicoId,
      valor_cobrado: formaPagamento === "cortesia" ? 0 : valorCobrado,
      forma_pagamento: formaPagamento,
      origem,
      cliente_nome: clienteNome?.trim() || null,
    })
    .eq("id", params.id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const orgId = await getOrgId();

  const atendimento = await buscarAtendimentoAberto(orgId, params.id);
  if (!atendimento) {
    return NextResponse.json({ erro: "Atendimento não encontrado" }, { status: 404 });
  }
  if (atendimento.closing_id) {
    return NextResponse.json(
      { erro: "Este atendimento já foi fechado e não pode mais ser excluído" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("transactions")
    .delete()
    .eq("id", params.id)
    .eq("org_id", orgId);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
