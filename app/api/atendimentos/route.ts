import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const orgId = await getOrgId();
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data") ?? new Date().toISOString().slice(0, 10);
  const barbeiro = searchParams.get("barbeiro");

  const inicio = new Date(`${data}T00:00:00.000Z`).toISOString();
  const fim = new Date(`${data}T23:59:59.999Z`).toISOString();

  let query = supabaseAdmin
    .from("transactions")
    .select(
      "id, valor_cobrado, forma_pagamento, origem, cliente_nome, criado_em, users(nome), services(nome)"
    )
    .eq("org_id", orgId)
    .gte("criado_em", inicio)
    .lte("criado_em", fim)
    .order("criado_em", { ascending: false });

  if (barbeiro) {
    query = query.eq("barber_id", barbeiro);
  }

  const { data: atendimentos, error } = await query;

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(atendimentos);
}

export async function POST(request: Request) {
  const orgId = await getOrgId();
  const { usuarioId, servicoId, formaPagamento, origem, clienteNome } = await request.json();

  if (
    typeof usuarioId !== "string" ||
    typeof servicoId !== "string" ||
    !["dinheiro", "pix", "cartao"].includes(formaPagamento) ||
    !["agendado", "encaixe"].includes(origem) ||
    (clienteNome !== undefined && typeof clienteNome !== "string")
  ) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  const { data: servico, error: servicoError } = await supabaseAdmin
    .from("services")
    .select("preco")
    .eq("id", servicoId)
    .eq("org_id", orgId)
    .single();

  if (servicoError || !servico) {
    return NextResponse.json({ erro: "Serviço não encontrado" }, { status: 404 });
  }

  const { data: atendimento, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      org_id: orgId,
      barber_id: usuarioId,
      service_id: servicoId,
      valor_cobrado: servico.preco,
      forma_pagamento: formaPagamento,
      origem,
      cliente_nome: clienteNome?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(atendimento, { status: 201 });
}
