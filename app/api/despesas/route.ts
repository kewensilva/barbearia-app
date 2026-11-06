import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";
import { CATEGORIAS_MANUAIS } from "@/lib/despesa";
import { SELECT_DESPESA, barbeiroValido } from "@/lib/despesaDb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const orgId = await getOrgId();
  const { searchParams } = new URL(request.url);
  const barbeiro = searchParams.get("barbeiro");

  let query = supabaseAdmin
    .from("expenses")
    .select(SELECT_DESPESA)
    .eq("org_id", orgId)
    .order("data", { ascending: false })
    .limit(100);

  if (barbeiro) {
    query = query.eq("barber_id", barbeiro);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const orgId = await getOrgId();
  const { descricao, categoria, valor, data, recorrente, barberId } = await request.json();

  if (
    typeof descricao !== "string" ||
    descricao.trim() === "" ||
    !CATEGORIAS_MANUAIS.includes(categoria) ||
    typeof valor !== "number" ||
    valor <= 0 ||
    typeof data !== "string"
  ) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  if (!(await barbeiroValido(orgId, barberId))) {
    return NextResponse.json({ erro: "Barbeiro não encontrado" }, { status: 404 });
  }

  const { data: despesa, error } = await supabaseAdmin
    .from("expenses")
    .insert({
      org_id: orgId,
      descricao: descricao.trim(),
      categoria,
      valor,
      data,
      recorrente: Boolean(recorrente),
      barber_id: barberId ?? null,
    })
    .select(SELECT_DESPESA)
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(despesa, { status: 201 });
}
