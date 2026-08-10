import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const orgId = await getOrgId();
  const { nome, ativo } = await request.json();

  const patch: Record<string, unknown> = {};
  if (typeof nome === "string" && nome.trim() !== "") patch.nome = nome.trim();
  if (typeof ativo === "boolean") patch.ativo = ativo;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ erro: "Nada para atualizar" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update(patch)
    .eq("id", params.id)
    .eq("org_id", orgId)
    .select("id, nome, role, ativo")
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
