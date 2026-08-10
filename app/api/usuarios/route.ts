import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const orgId = await getOrgId();
  const { searchParams } = new URL(request.url);
  const todos = searchParams.get("todos") === "1";

  let query = supabaseAdmin
    .from("users")
    .select("id, nome, role, ativo")
    .eq("org_id", orgId)
    .order("nome");

  if (!todos) {
    query = query.eq("ativo", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const orgId = await getOrgId();
  const { nome, role, pin } = await request.json();

  if (
    typeof nome !== "string" ||
    nome.trim() === "" ||
    !["admin", "barber"].includes(role) ||
    typeof pin !== "string" ||
    !/^\d{4}$/.test(pin)
  ) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  const pin_hash = await bcrypt.hash(pin, 10);

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({ org_id: orgId, nome: nome.trim(), role, pin_hash })
    .select("id, nome, role, ativo")
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
