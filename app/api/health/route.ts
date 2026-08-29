import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Chamado diariamente por um cron da Vercel (ver vercel.json) só pra manter
// o projeto Supabase ativo — o plano free pausa após ~7 dias sem uso.
export async function GET() {
  const { error } = await supabaseAdmin.from("organizations").select("id").limit(1);

  if (error) {
    return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, checado_em: new Date().toISOString() });
}
