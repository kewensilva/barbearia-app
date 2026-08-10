import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await getOrgId();

  const { data: barbeiros, error } = await supabaseAdmin
    .from("users")
    .select("id, nome")
    .eq("org_id", orgId)
    .eq("role", "barber")
    .eq("ativo", true)
    .order("nome");

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  const resultado = await Promise.all(
    barbeiros.map(async (barbeiro) => {
      const [{ data: comissao }, { data: periodicidade }] = await Promise.all([
        supabaseAdmin
          .from("commission_settings")
          .select("tipo, valor, vigente_desde")
          .eq("org_id", orgId)
          .eq("barber_id", barbeiro.id)
          .order("vigente_desde", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("closing_settings")
          .select("periodicidade, dia_referencia")
          .eq("org_id", orgId)
          .eq("barber_id", barbeiro.id)
          .maybeSingle(),
      ]);

      return { ...barbeiro, comissao, periodicidade };
    })
  );

  return NextResponse.json(resultado);
}
