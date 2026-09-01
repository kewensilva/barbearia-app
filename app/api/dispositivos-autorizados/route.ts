import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId, getDeviceIdOrNull } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await getOrgId();
  const deviceId = await getDeviceIdOrNull();

  const { data: dispositivos, error } = await supabaseAdmin
    .from("authorized_devices")
    .select("id, device_id, nome, criado_em")
    .eq("org_id", orgId)
    .order("criado_em", { ascending: true });

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({
    deviceId,
    autorizado: dispositivos.some((d) => d.device_id === deviceId),
    dispositivos,
  });
}

export async function POST(request: Request) {
  const orgId = await getOrgId();
  const deviceId = await getDeviceIdOrNull();
  const { nome } = await request.json();

  if (!deviceId) {
    return NextResponse.json({ erro: "Dispositivo sem identificador ainda" }, { status: 400 });
  }
  if (typeof nome !== "string" || nome.trim() === "") {
    return NextResponse.json({ erro: "Dê um apelido pro dispositivo" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("authorized_devices")
    .upsert(
      { org_id: orgId, device_id: deviceId, nome: nome.trim() },
      { onConflict: "org_id,device_id" }
    )
    .select("id, device_id, nome, criado_em")
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
