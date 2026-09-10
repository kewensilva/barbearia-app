import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const orgId = await getOrgId();
  const { nome, preco, comissaoPercentual, ativo } = await request.json();

  const patch: Record<string, unknown> = {};
  if (typeof nome === "string" && nome.trim() !== "") patch.nome = nome.trim();
  if (typeof preco === "number" && preco > 0) patch.preco = preco;
  if (comissaoPercentual === null) patch.comissao_percentual = null;
  else if (typeof comissaoPercentual === "number" && comissaoPercentual >= 0 && comissaoPercentual <= 100) {
    patch.comissao_percentual = comissaoPercentual;
  }
  if (typeof ativo === "boolean") patch.ativo = ativo;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ erro: "Nada para atualizar" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .update(patch)
    .eq("id", params.id)
    .eq("org_id", orgId)
    .select("id, nome, preco, comissao_percentual, ativo")
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
