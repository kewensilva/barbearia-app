import { cookies } from "next/headers";

// Multi-tenant real: cada dispositivo/navegador fica vinculado a UMA
// organization via cookie, definida no cadastro da barbearia ou ao entrar
// com um código de acesso existente (ver /api/organizacoes).
export const ORG_COOKIE = "org_id";

// Vínculo opcional de um dispositivo pessoal a um usuário específico
// (ver /api/dispositivo) — pula seleção de usuário e PIN nesse aparelho.
export const USUARIO_FIXO_COOKIE = "usuario_fixo_id";

export async function getOrgId(): Promise<string> {
  const orgId = cookies().get(ORG_COOKIE)?.value;
  if (!orgId) {
    throw new Error("Nenhuma organização vinculada a este dispositivo");
  }
  return orgId;
}

export async function getOrgIdOrNull(): Promise<string | null> {
  return cookies().get(ORG_COOKIE)?.value ?? null;
}
