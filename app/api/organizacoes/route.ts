import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ORG_COOKIE } from "@/lib/org";
import { gerarCodigoAcesso } from "@/lib/codigoAcesso";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { nomeBarbearia, nomeAdmin, pin } = await request.json();

  if (
    typeof nomeBarbearia !== "string" ||
    nomeBarbearia.trim() === "" ||
    typeof nomeAdmin !== "string" ||
    nomeAdmin.trim() === "" ||
    typeof pin !== "string" ||
    !/^\d{4}$/.test(pin)
  ) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  let codigoAcesso = gerarCodigoAcesso();
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const { data: existente } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("codigo_acesso", codigoAcesso)
      .maybeSingle();
    if (!existente) break;
    codigoAcesso = gerarCodigoAcesso();
  }

  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizations")
    .insert({ nome: nomeBarbearia.trim(), codigo_acesso: codigoAcesso })
    .select()
    .single();

  if (orgError) {
    return NextResponse.json({ erro: orgError.message }, { status: 500 });
  }

  const pin_hash = await bcrypt.hash(pin, 10);
  const { data: admin, error: userError } = await supabaseAdmin
    .from("users")
    .insert({ org_id: org.id, nome: nomeAdmin.trim(), role: "admin", pin_hash })
    .select("id, nome, role")
    .single();

  if (userError) {
    return NextResponse.json({ erro: userError.message }, { status: 500 });
  }

  const response = NextResponse.json(
    { orgId: org.id, nomeBarbearia: org.nome, codigoAcesso, admin },
    { status: 201 }
  );
  response.cookies.set(ORG_COOKIE, org.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 5,
    path: "/",
  });
  return response;
}
