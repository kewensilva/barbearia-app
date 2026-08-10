import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 5;

export async function POST(request: Request) {
  const { usuarioId, pin } = await request.json();

  if (typeof usuarioId !== "string" || typeof pin !== "string" || pin.length !== 4) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  const orgId = await getOrgId();

  const { data: usuario, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id, nome, role, pin_hash, pin_tentativas_falhas, pin_bloqueado_ate")
    .eq("id", usuarioId)
    .eq("org_id", orgId)
    .eq("ativo", true)
    .single();

  if (fetchError || !usuario) {
    return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });
  }

  if (usuario.pin_bloqueado_ate && new Date(usuario.pin_bloqueado_ate) > new Date()) {
    return NextResponse.json(
      { ok: false, bloqueadoAte: usuario.pin_bloqueado_ate },
      { status: 423 }
    );
  }

  const confere = await bcrypt.compare(pin, usuario.pin_hash);

  if (!confere) {
    const tentativas = usuario.pin_tentativas_falhas + 1;
    const bloqueado = tentativas >= MAX_TENTATIVAS;

    await supabaseAdmin
      .from("users")
      .update({
        pin_tentativas_falhas: bloqueado ? 0 : tentativas,
        pin_bloqueado_ate: bloqueado
          ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60_000).toISOString()
          : null,
      })
      .eq("id", usuario.id);

    return NextResponse.json(
      {
        ok: false,
        bloqueadoAte: bloqueado
          ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60_000).toISOString()
          : null,
      },
      { status: 401 }
    );
  }

  await supabaseAdmin
    .from("users")
    .update({ pin_tentativas_falhas: 0, pin_bloqueado_ate: null })
    .eq("id", usuario.id);

  return NextResponse.json({ ok: true, usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role } });
}
