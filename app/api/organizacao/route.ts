import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgIdOrNull, getOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await getOrgIdOrNull();

  if (!orgId) {
    return NextResponse.json({ vinculado: false });
  }

  const { data: org, error } = await supabaseAdmin
    .from("organizations")
    .select("id, nome, codigo_acesso, mostrar_nome_cliente")
    .eq("id", orgId)
    .maybeSingle();

  if (error || !org) {
    return NextResponse.json({ vinculado: false });
  }

  return NextResponse.json({
    vinculado: true,
    id: org.id,
    nome: org.nome,
    codigoAcesso: org.codigo_acesso,
    mostrarNomeCliente: org.mostrar_nome_cliente,
  });
}

export async function PATCH(request: Request) {
  const orgId = await getOrgId();
  const { mostrarNomeCliente } = await request.json();

  if (typeof mostrarNomeCliente !== "boolean") {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("organizations")
    .update({ mostrar_nome_cliente: mostrarNomeCliente })
    .eq("id", orgId)
    .select("id, nome, codigo_acesso, mostrar_nome_cliente")
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({
    vinculado: true,
    id: data.id,
    nome: data.nome,
    codigoAcesso: data.codigo_acesso,
    mostrarNomeCliente: data.mostrar_nome_cliente,
  });
}
