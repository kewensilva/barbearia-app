// Seed de dados de teste no Supabase real.
// Uso: node scripts/seed.mjs  (lê NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do .env.local)
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

async function main() {
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ nome: "Barbearia Teste" })
    .select()
    .single();
  if (orgError) throw orgError;
  console.log("organization criada:", org.id);

  const usersToCreate = [
    { nome: "Carlos (dono)", role: "admin", pin: "1234" },
    { nome: "Jonas (contratado)", role: "barber", pin: "5678" },
  ];

  const createdUsers = [];
  for (const u of usersToCreate) {
    const pin_hash = await bcrypt.hash(u.pin, 10);
    const { data: user, error } = await supabase
      .from("users")
      .insert({ org_id: org.id, nome: u.nome, role: u.role, pin_hash })
      .select()
      .single();
    if (error) throw error;
    createdUsers.push(user);
    console.log(`usuário criado: ${u.nome} (PIN de teste: ${u.pin})`);
  }

  const barber = createdUsers.find((u) => u.role === "barber");
  const { error: commissionError } = await supabase.from("commission_settings").insert({
    org_id: org.id,
    barber_id: barber.id,
    tipo: "percentual",
    valor: 50,
  });
  if (commissionError) throw commissionError;

  const { error: closingSettingsError } = await supabase.from("closing_settings").insert({
    org_id: org.id,
    barber_id: barber.id,
    periodicidade: "semanal",
    dia_referencia: 6,
  });
  if (closingSettingsError) throw closingSettingsError;

  const services = [
    { nome: "Corte", preco: 45 },
    { nome: "Barba", preco: 25 },
    { nome: "Corte + Barba", preco: 60 },
  ];
  const { error: servicesError } = await supabase
    .from("services")
    .insert(services.map((s) => ({ ...s, org_id: org.id })));
  if (servicesError) throw servicesError;
  console.log("serviços criados:", services.map((s) => s.nome).join(", "));

  console.log("\nSeed concluído.");
}

main().catch((err) => {
  console.error("Erro no seed:", err.message);
  process.exit(1);
});
