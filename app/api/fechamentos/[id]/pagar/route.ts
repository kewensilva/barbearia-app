import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";
import { hojeBrasil } from "@/lib/data";

const FUSO_HORARIO = "America/Sao_Paulo";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const orgId = await getOrgId();

  const { data: closing, error: fetchError } = await supabaseAdmin
    .from("closings")
    .select("id, barber_id, total_comissao, status, periodo_inicio, periodo_fim, users(nome)")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .single();

  if (fetchError || !closing) {
    return NextResponse.json({ erro: "Fechamento não encontrado" }, { status: 404 });
  }

  if (closing.status !== "pendente") {
    return NextResponse.json({ erro: "Fechamento já foi pago" }, { status: 400 });
  }

  const pagoEm = new Date().toISOString();

  const { data: closingPago, error: updateError } = await supabaseAdmin
    .from("closings")
    .update({ status: "pago", pago_em: pagoEm })
    .eq("id", closing.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ erro: updateError.message }, { status: 500 });
  }

  if (closing.total_comissao > 0) {
    const nomeBarbeiro = (closing.users as unknown as { nome: string } | null)?.nome ?? "barbeiro";
    const periodo = `${new Date(closing.periodo_inicio).toLocaleDateString("pt-BR", {
      timeZone: FUSO_HORARIO,
    })} a ${new Date(closing.periodo_fim).toLocaleDateString("pt-BR", { timeZone: FUSO_HORARIO })}`;

    const { error: expenseError } = await supabaseAdmin.from("expenses").insert({
      org_id: orgId,
      descricao: `Comissão - ${nomeBarbeiro} - ${periodo}`,
      categoria: "comissao",
      valor: closing.total_comissao,
      data: hojeBrasil(),
      recorrente: false,
      closing_id: closing.id,
    });

    if (expenseError) {
      return NextResponse.json({ erro: expenseError.message }, { status: 500 });
    }
  }

  return NextResponse.json(closingPago);
}
