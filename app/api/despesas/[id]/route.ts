import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";
import { categoriaPermitida } from "@/lib/despesa";
import { SELECT_DESPESA, barbeiroValido } from "@/lib/despesaDb";

export const dynamic = "force-dynamic";

// Despesas geradas por um fechamento (comissão) não podem ser alteradas
// por aqui — senão o fluxo de caixa deixa de bater com o fechamento pago.
async function buscarDespesaManual(orgId: string, id: string) {
  const { data: despesa } = await supabaseAdmin
    .from("expenses")
    .select("id, closing_id, barber_id")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  return despesa;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const orgId = await getOrgId();
  const { descricao, categoria, valor, data, recorrente, barberId } = await request.json();

  if (
    typeof descricao !== "string" ||
    descricao.trim() === "" ||
    typeof categoria !== "string" ||
    typeof valor !== "number" ||
    valor <= 0 ||
    typeof data !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data)
  ) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  const despesa = await buscarDespesaManual(orgId, params.id);
  if (!despesa) {
    return NextResponse.json({ erro: "Despesa não encontrada" }, { status: 404 });
  }
  if (despesa.closing_id) {
    return NextResponse.json(
      { erro: "Despesa gerada por fechamento não pode ser alterada" },
      { status: 400 }
    );
  }

  if (!(await barbeiroValido(orgId, barberId))) {
    return NextResponse.json({ erro: "Barbeiro não encontrado" }, { status: 404 });
  }

  // barberId undefined = continua com o dono atual da despesa
  const donoFinal = barberId !== undefined ? barberId : despesa.barber_id;
  if (!categoriaPermitida(categoria, Boolean(donoFinal))) {
    return NextResponse.json({ erro: "Categoria não permitida para essa despesa" }, { status: 400 });
  }

  const { data: atualizada, error } = await supabaseAdmin
    .from("expenses")
    .update({
      descricao: descricao.trim(),
      categoria,
      valor,
      data,
      recorrente: Boolean(recorrente),
      // undefined = não mexe em quem é o dono da despesa
      ...(barberId !== undefined ? { barber_id: barberId } : {}),
    })
    .eq("id", params.id)
    .eq("org_id", orgId)
    .select(SELECT_DESPESA)
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(atualizada);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const orgId = await getOrgId();

  const despesa = await buscarDespesaManual(orgId, params.id);
  if (!despesa) {
    return NextResponse.json({ erro: "Despesa não encontrada" }, { status: 404 });
  }
  if (despesa.closing_id) {
    return NextResponse.json(
      { erro: "Despesa gerada por fechamento não pode ser excluída" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("expenses")
    .delete()
    .eq("id", params.id)
    .eq("org_id", orgId);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
