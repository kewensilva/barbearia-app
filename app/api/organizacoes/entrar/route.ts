import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ORG_COOKIE } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { codigo } = await request.json();

  if (typeof codigo !== "string" || codigo.trim() === "") {
    return NextResponse.json({ erro: "Informe o código de acesso" }, { status: 400 });
  }

  const { data: org, error } = await supabaseAdmin
    .from("organizations")
    .select("id, nome")
    .eq("codigo_acesso", codigo.trim().toUpperCase())
    .maybeSingle();

  if (error || !org) {
    return NextResponse.json({ erro: "Código de acesso não encontrado" }, { status: 404 });
  }

  const response = NextResponse.json({ orgId: org.id, nomeBarbearia: org.nome });
  response.cookies.set(ORG_COOKIE, org.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 5,
    path: "/",
  });
  return response;
}
