import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

const CATEGORIAS_MANUAIS = ["aluguel", "energia", "internet", "produtos", "outros"];

export async function GET() {
  const orgId = await getOrgId();

  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select("id, descricao, categoria, valor, data, recorrente, closing_id, criado_em")
    .eq("org_id", orgId)
    .order("data", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const orgId = await getOrgId();
  const { descricao, categoria, valor, data, recorrente } = await request.json();

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

  const { data: despesa, error } = await supabaseAdmin
    .from("expenses")
    .insert({
      org_id: orgId,
      descricao: descricao.trim(),
      categoria,
      valor,
      data,
      recorrente: Boolean(recorrente),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(despesa, { status: 201 });
}
