import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Só server-side (usa a service role). Compartilhado pelas rotas de despesas.
export const SELECT_DESPESA =
  "id, descricao, categoria, valor, data, recorrente, closing_id, criado_em, barber_id, users(nome)";

// barberId null = despesa da barbearia; string = despesa de um barbeiro,
// que precisa ser um usuário dessa mesma organização.
export async function barbeiroValido(orgId: string, barberId: unknown): Promise<boolean> {
  if (barberId === null || barberId === undefined) return true;
  if (typeof barberId !== "string") return false;

  const { data: usuario } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", barberId)
    .eq("org_id", orgId)
    .maybeSingle();

  return Boolean(usuario);
}
