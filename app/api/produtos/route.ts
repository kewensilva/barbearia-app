import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const orgId = await getOrgId();
  const { searchParams } = new URL(request.url);
  const todos = searchParams.get("todos") === "1";

  let query = supabaseAdmin
    .from("products")
    .select("id, nome, preco, comissao_percentual, ativo")
    .eq("org_id", orgId)
    .order("nome");

  if (!todos) {
    query = query.eq("ativo", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const orgId = await getOrgId();
  const { nome, preco, comissaoPercentual } = await request.json();

  if (
    typeof nome !== "string" ||
    nome.trim() === "" ||
    typeof preco !== "number" ||
    preco <= 0 ||
    (comissaoPercentual !== undefined &&
      comissaoPercentual !== null &&
      (typeof comissaoPercentual !== "number" || comissaoPercentual < 0 || comissaoPercentual > 100))
  ) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({
      org_id: orgId,
      nome: nome.trim(),
      preco,
      comissao_percentual: comissaoPercentual ?? null,
    })
    .select("id, nome, preco, comissao_percentual, ativo")
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
