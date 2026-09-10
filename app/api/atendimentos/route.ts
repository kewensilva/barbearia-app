import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId, getDeviceIdOrNull } from "@/lib/org";
import { calcularValorComDesconto } from "@/lib/desconto";
import { calcularVendaProduto } from "@/lib/produto";
import { hojeBrasil, limitesDoDiaBrasil } from "@/lib/data";

export const dynamic = "force-dynamic";

const SELECT_ATENDIMENTO =
  "id, valor_cobrado, forma_pagamento, origem, cliente_nome, criado_em, closing_id, service_id, barber_id, product_id, valor_produto, comissao_produto, users(nome), services(nome), products(nome)";

export async function GET(request: Request) {
  const orgId = await getOrgId();
  const { searchParams } = new URL(request.url);
  const barbeiro = searchParams.get("barbeiro");
  const inicioParam = searchParams.get("inicio");
  const fimParam = searchParams.get("fim");

  let inicio: string;
  let fim: string;

  if (inicioParam && fimParam) {
    inicio = limitesDoDiaBrasil(inicioParam).inicio;
    fim = limitesDoDiaBrasil(fimParam).fim;
  } else {
    const data = searchParams.get("data") ?? hojeBrasil();
    ({ inicio, fim } = limitesDoDiaBrasil(data));
  }

  let query = supabaseAdmin
    .from("transactions")
    .select(SELECT_ATENDIMENTO)
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
  const { usuarioId, servicoId, formaPagamento, origem, clienteNome, desconto, produtoId } =
    await request.json();

  if (
    typeof usuarioId !== "string" ||
    typeof servicoId !== "string" ||
    !["dinheiro", "pix", "cartao", "cortesia"].includes(formaPagamento) ||
    !["agendado", "encaixe"].includes(origem) ||
    (clienteNome !== undefined && typeof clienteNome !== "string") ||
    (desconto !== undefined && (typeof desconto !== "number" || desconto < 0)) ||
    (produtoId !== undefined && produtoId !== null && typeof produtoId !== "string")
  ) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  if (formaPagamento === "cortesia" && !clienteNome?.trim()) {
    return NextResponse.json(
      { erro: "Informe o nome do cliente para registrar a cortesia" },
      { status: 400 }
    );
  }

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("somente_admin_lanca")
    .eq("id", orgId)
    .single();

  if (org?.somente_admin_lanca) {
    const deviceId = await getDeviceIdOrNull();
    const { data: autorizado } = deviceId
      ? await supabaseAdmin
          .from("authorized_devices")
          .select("id")
          .eq("org_id", orgId)
          .eq("device_id", deviceId)
          .maybeSingle()
      : { data: null };

    if (!autorizado) {
      return NextResponse.json(
        { erro: "Este dispositivo não está autorizado a lançar atendimentos" },
        { status: 403 }
      );
    }
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

  let valorProduto: number | null = null;
  let comissaoProduto: number | null = null;

  if (produtoId) {
    const { data: produto, error: produtoError } = await supabaseAdmin
      .from("products")
      .select("preco, comissao_percentual")
      .eq("id", produtoId)
      .eq("org_id", orgId)
      .single();

    if (produtoError || !produto) {
      return NextResponse.json({ erro: "Produto não encontrado" }, { status: 404 });
    }

    const venda = calcularVendaProduto(produto.preco, produto.comissao_percentual, formaPagamento);
    valorProduto = venda.valorProduto;
    comissaoProduto = venda.comissaoProduto;
  }

  const { data: atendimento, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      org_id: orgId,
      barber_id: usuarioId,
      service_id: servicoId,
      valor_cobrado: calcularValorComDesconto(servico.preco, desconto, formaPagamento),
      forma_pagamento: formaPagamento,
      origem,
      cliente_nome: clienteNome?.trim() || null,
      product_id: produtoId || null,
      valor_produto: valorProduto,
      comissao_produto: comissaoProduto,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(atendimento, { status: 201 });
}
