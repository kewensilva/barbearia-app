import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await getOrgId();

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, nome, role")
    .eq("org_id", orgId)
    .eq("ativo", true)
    .order("nome");

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
