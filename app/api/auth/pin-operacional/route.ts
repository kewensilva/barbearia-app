import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 5;

// PIN operacional: só desbloqueia a tela de lançar atendimento (com o
// seletor de atendente), quando "somente admin lança" está ativo. Não dá
// acesso a relatório, despesas, configurações, usuários, serviços ou
// fechamentos — essas áreas continuam exigindo o PIN pessoal do admin.
export async function POST(request: Request) {
  const { pin } = await request.json();

  if (typeof pin !== "string" || pin.length !== 4) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  const orgId = await getOrgId();

  const { data: org, error: fetchError } = await supabaseAdmin
    .from("organizations")
    .select("pin_operacional_hash, pin_operacional_tentativas_falhas, pin_operacional_bloqueado_ate")
    .eq("id", orgId)
    .single();

  if (fetchError || !org || !org.pin_operacional_hash) {
    return NextResponse.json({ erro: "PIN operacional não configurado" }, { status: 400 });
  }

  if (
    org.pin_operacional_bloqueado_ate &&
    new Date(org.pin_operacional_bloqueado_ate) > new Date()
  ) {
    return NextResponse.json(
      { ok: false, bloqueadoAte: org.pin_operacional_bloqueado_ate },
      { status: 423 }
    );
  }

  const confere = await bcrypt.compare(pin, org.pin_operacional_hash);

  if (!confere) {
    const tentativas = org.pin_operacional_tentativas_falhas + 1;
    const bloqueado = tentativas >= MAX_TENTATIVAS;

    await supabaseAdmin
      .from("organizations")
      .update({
        pin_operacional_tentativas_falhas: bloqueado ? 0 : tentativas,
        pin_operacional_bloqueado_ate: bloqueado
          ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60_000).toISOString()
          : null,
      })
      .eq("id", orgId);

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
    .from("organizations")
    .update({ pin_operacional_tentativas_falhas: 0, pin_operacional_bloqueado_ate: null })
    .eq("id", orgId);

  const { data: admin } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("org_id", orgId)
    .eq("role", "admin")
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (!admin) {
    return NextResponse.json({ erro: "Nenhum admin ativo encontrado" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, adminId: admin.id });
}
