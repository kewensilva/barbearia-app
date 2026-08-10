import { supabaseAdmin } from "@/lib/supabaseAdmin";

// MVP de tenant único: cada deploy atende uma barbearia, então basta pegar
// a única organization cadastrada. Onboarding multi-tenant real (Fase 4 do
// roadmap) troca isto por resolução via domínio/subdomínio ou sessão de device.
export async function getOrgId(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("Nenhuma organization encontrada");
  }

  return data.id as string;
}
