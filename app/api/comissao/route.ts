import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

export async function POST(request: Request) {
  const orgId = await getOrgId();
  const { barberId, tipo, valor } = await request.json();

  if (
    typeof barberId !== "string" ||
    !["percentual", "fixo"].includes(tipo) ||
    typeof valor !== "number" ||
    valor <= 0
  ) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("commission_settings")
    .insert({ org_id: orgId, barber_id: barberId, tipo, valor })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
