import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

const PERIODICIDADES = ["diario", "semanal", "quinzenal", "mensal"];

export async function POST(request: Request) {
  const orgId = await getOrgId();
  const { barberId, periodicidade, diaReferencia } = await request.json();

  if (typeof barberId !== "string" || !PERIODICIDADES.includes(periodicidade)) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  const { data: existente } = await supabaseAdmin
    .from("closing_settings")
    .select("id")
    .eq("org_id", orgId)
    .eq("barber_id", barberId)
    .maybeSingle();

  const payload = {
    org_id: orgId,
    barber_id: barberId,
    periodicidade,
    dia_referencia: diaReferencia ?? null,
  };

  const { data, error } = existente
    ? await supabaseAdmin
        .from("closing_settings")
        .update(payload)
        .eq("id", existente.id)
        .select()
        .single()
    : await supabaseAdmin.from("closing_settings").insert(payload).select().single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
