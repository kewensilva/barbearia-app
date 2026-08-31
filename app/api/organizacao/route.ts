import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgIdOrNull, getOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

const CAMPOS = "id, nome, codigo_acesso, mostrar_nome_cliente, pin_areas_sensiveis";

function serializar(org: {
  id: string;
  nome: string;
  codigo_acesso: string | null;
  mostrar_nome_cliente: boolean;
  pin_areas_sensiveis: boolean;
}) {
  return {
    vinculado: true,
    id: org.id,
    nome: org.nome,
    codigoAcesso: org.codigo_acesso,
    mostrarNomeCliente: org.mostrar_nome_cliente,
    pinAreasSensiveis: org.pin_areas_sensiveis,
  };
}

export async function GET() {
  const orgId = await getOrgIdOrNull();

  if (!orgId) {
    return NextResponse.json({ vinculado: false });
  }

  const { data: org, error } = await supabaseAdmin
    .from("organizations")
    .select(CAMPOS)
    .eq("id", orgId)
    .maybeSingle();

  if (error || !org) {
    return NextResponse.json({ vinculado: false });
  }

  return NextResponse.json(serializar(org));
}

export async function PATCH(request: Request) {
  const orgId = await getOrgId();
  const { mostrarNomeCliente, pinAreasSensiveis } = await request.json();

  const patch: Record<string, boolean> = {};
  if (typeof mostrarNomeCliente === "boolean") patch.mostrar_nome_cliente = mostrarNomeCliente;
  if (typeof pinAreasSensiveis === "boolean") patch.pin_areas_sensiveis = pinAreasSensiveis;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ erro: "Nada para atualizar" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("organizations")
    .update(patch)
    .eq("id", orgId)
    .select(CAMPOS)
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(serializar(data));
}
