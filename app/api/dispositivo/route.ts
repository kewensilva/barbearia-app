import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgIdOrNull, USUARIO_FIXO_COOKIE } from "@/lib/org";

export const dynamic = "force-dynamic";

const CINCO_ANOS = 60 * 60 * 24 * 365 * 5;

export async function GET() {
  const orgId = await getOrgIdOrNull();
  const usuarioFixoId = cookies().get(USUARIO_FIXO_COOKIE)?.value;

  if (!orgId || !usuarioFixoId) {
    return NextResponse.json({ usuarioFixo: null });
  }

  const { data: usuario } = await supabaseAdmin
    .from("users")
    .select("id, nome, role")
    .eq("id", usuarioFixoId)
    .eq("org_id", orgId)
    .eq("ativo", true)
    .maybeSingle();

  return NextResponse.json({ usuarioFixo: usuario ?? null });
}

export async function POST(request: Request) {
  const orgId = await getOrgIdOrNull();
  const { usuarioId, pin } = await request.json();

  if (!orgId || typeof usuarioId !== "string" || typeof pin !== "string") {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  const { data: usuario } = await supabaseAdmin
    .from("users")
    .select("id, pin_hash")
    .eq("id", usuarioId)
    .eq("org_id", orgId)
    .eq("ativo", true)
    .maybeSingle();

  if (!usuario) {
    return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });
  }

  const confere = await bcrypt.compare(pin, usuario.pin_hash);
  if (!confere) {
    return NextResponse.json({ erro: "PIN incorreto" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(USUARIO_FIXO_COOKIE, usuarioId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: CINCO_ANOS,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(USUARIO_FIXO_COOKIE);
  return response;
}
