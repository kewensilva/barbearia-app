// Apaga TODOS os dados do banco (produção) e recria organization + admin do zero.
// Uso: node scripts/reset.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] ??= rest.join("=").trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function limparTudo() {
  const tabelas = [
    "expenses",
    "transactions",
    "closings",
    "commission_settings",
    "closing_settings",
    "services",
    "users",
    "organizations",
  ];
  for (const tabela of tabelas) {
    const { error } = await supabase
      .from(tabela)
      .delete()
      .not("id", "is", null);
    if (error) throw new Error(`Erro limpando ${tabela}: ${error.message}`);
    console.log(`${tabela}: limpo`);
  }
}

async function recriar() {
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ nome: "Barbearia do Kewen" })
    .select()
    .single();
  if (orgError) throw orgError;
  console.log("organization criada:", org.id);

  const pin_hash = await bcrypt.hash("1234", 10);
  const { data: admin, error: userError } = await supabase
    .from("users")
    .insert({ org_id: org.id, nome: "Kewen", role: "admin", pin_hash })
    .select()
    .single();
  if (userError) throw userError;
  console.log("admin criado:", admin.nome, "(PIN 1234)");
}

async function main() {
  await limparTudo();
  await recriar();
  console.log("\nReset concluído.");
}

main().catch((err) => {
  console.error("Erro no reset:", err.message);
  process.exit(1);
});
