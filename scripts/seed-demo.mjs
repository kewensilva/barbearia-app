// Zera TODO o banco e recria uma barbearia de demonstração completa
// (admin, 2 barbeiros contratados, serviços, comissões, periodicidade,
// atendimentos de exemplo — incluindo um já fechado e pago — despesas e
// uma cortesia). Uso: node scripts/seed-demo.mjs
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

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function gerarCodigo() {
  let c = "";
  for (let i = 0; i < 6; i++) c += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return c;
}

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
    const { error } = await supabase.from(tabela).delete().not("id", "is", null);
    if (error) throw new Error(`Erro limpando ${tabela}: ${error.message}`);
  }
  console.log("Banco zerado.");
}

async function main() {
  await limparTudo();

  const codigoAcesso = gerarCodigo();
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ nome: "Barbearia Vintage", codigo_acesso: codigoAcesso, mostrar_nome_cliente: true })
    .select()
    .single();
  if (orgError) throw orgError;
  console.log("Organization:", org.nome, "| código de acesso:", codigoAcesso);

  async function criarUsuario(nome, role, pin) {
    const pin_hash = await bcrypt.hash(pin, 10);
    const { data, error } = await supabase
      .from("users")
      .insert({ org_id: org.id, nome, role, pin_hash })
      .select()
      .single();
    if (error) throw error;
    console.log(`Usuário: ${nome} (${role}, PIN ${pin})`);
    return data;
  }

  const admin = await criarUsuario("Fernando Costa", "admin", "1234");
  const lucas = await criarUsuario("Lucas Andrade", "barber", "5678");
  const rafael = await criarUsuario("Rafael Souza", "barber", "4321");

  await supabase.from("commission_settings").insert([
    { org_id: org.id, barber_id: lucas.id, tipo: "percentual", valor: 50 },
    { org_id: org.id, barber_id: rafael.id, tipo: "fixo", valor: 15 },
  ]);
  await supabase.from("closing_settings").insert([
    { org_id: org.id, barber_id: lucas.id, periodicidade: "semanal", dia_referencia: 6 },
    { org_id: org.id, barber_id: rafael.id, periodicidade: "mensal", dia_referencia: 1 },
  ]);
  console.log("Comissão e periodicidade configuradas.");

  const servicosBase = [
    { nome: "Corte Masculino", preco: 45 },
    { nome: "Barba", preco: 25 },
    { nome: "Corte + Barba", preco: 65 },
    { nome: "Sobrancelha", preco: 15 },
    { nome: "Luzes / Coloração", preco: 80 },
    { nome: "Corte Infantil", preco: 35 },
  ];
  const { data: servicos, error: servicosError } = await supabase
    .from("services")
    .insert(servicosBase.map((s) => ({ ...s, org_id: org.id })))
    .select();
  if (servicosError) throw servicosError;
  console.log("Serviços:", servicos.map((s) => s.nome).join(", "));

  const servicoPorNome = Object.fromEntries(servicos.map((s) => [s.nome, s]));

  // --- Fechamento já pago (histórico de ontem), pra mostrar o ciclo completo ---
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const criadoOntem = (hora) => {
    const d = new Date(ontem);
    d.setHours(hora, 0, 0, 0);
    return d.toISOString();
  };

  const atendimentosOntemLucas = [
    { servico: "Corte Masculino", forma: "dinheiro", hora: 9 },
    { servico: "Barba", forma: "pix", hora: 11 },
    { servico: "Corte + Barba", forma: "cartao", hora: 15 },
  ];

  const { data: transacoesOntem, error: transacoesOntemError } = await supabase
    .from("transactions")
    .insert(
      atendimentosOntemLucas.map((a) => ({
        org_id: org.id,
        barber_id: lucas.id,
        service_id: servicoPorNome[a.servico].id,
        valor_cobrado: servicoPorNome[a.servico].preco,
        forma_pagamento: a.forma,
        origem: "agendado",
        criado_em: criadoOntem(a.hora),
      }))
    )
    .select();
  if (transacoesOntemError) throw transacoesOntemError;

  const totalBrutoOntem = transacoesOntem.reduce((s, t) => s + t.valor_cobrado, 0);
  const totalComissaoOntem = Math.round(totalBrutoOntem * 0.5 * 100) / 100;

  const { data: closing, error: closingError } = await supabase
    .from("closings")
    .insert({
      org_id: org.id,
      barber_id: lucas.id,
      periodo_inicio: transacoesOntem[0].criado_em,
      periodo_fim: transacoesOntem[transacoesOntem.length - 1].criado_em,
      total_bruto: totalBrutoOntem,
      total_comissao: totalComissaoOntem,
      status: "pago",
      pago_em: criadoOntem(18),
    })
    .select()
    .single();
  if (closingError) throw closingError;

  await supabase
    .from("transactions")
    .update({ closing_id: closing.id })
    .in("id", transacoesOntem.map((t) => t.id));

  await supabase.from("expenses").insert({
    org_id: org.id,
    descricao: `Comissão - ${lucas.nome} - ${ontem.toLocaleDateString("pt-BR")}`,
    categoria: "comissao",
    valor: totalComissaoOntem,
    data: ontem.toISOString().slice(0, 10),
    recorrente: false,
    closing_id: closing.id,
  });
  console.log(
    `Fechamento de ontem (${lucas.nome}): bruto R$${totalBrutoOntem}, comissão R$${totalComissaoOntem}, status pago.`
  );

  // --- Atendimentos de hoje, ainda pendentes de fechar (pro demo do "Fechar caixa") ---
  const hoje = new Date();
  const criadoHoje = (hora, minuto = 0) => {
    const d = new Date(hoje);
    d.setHours(hora, minuto, 0, 0);
    return d.toISOString();
  };

  const atendimentosHoje = [
    { barbeiro: admin, servico: "Corte Masculino", forma: "dinheiro", hora: [9, 10], cliente: null },
    { barbeiro: lucas, servico: "Barba", forma: "pix", hora: [9, 40], cliente: "Marcos Vieira" },
    { barbeiro: lucas, servico: "Corte + Barba", forma: "cartao", hora: [10, 30], cliente: "Paulo Henrique" },
    { barbeiro: rafael, servico: "Sobrancelha", forma: "dinheiro", hora: [11, 15], cliente: null },
    { barbeiro: rafael, servico: "Luzes / Coloração", forma: "pix", hora: [14, 0], cliente: "Diego Martins" },
    { barbeiro: lucas, servico: "Corte Infantil", forma: "cortesia", hora: [15, 20], cliente: "Filho da Dona Marta" },
  ];

  const { error: hojeError } = await supabase.from("transactions").insert(
    atendimentosHoje.map((a) => ({
      org_id: org.id,
      barber_id: a.barbeiro.id,
      service_id: servicoPorNome[a.servico].id,
      valor_cobrado: a.forma === "cortesia" ? 0 : servicoPorNome[a.servico].preco,
      forma_pagamento: a.forma,
      origem: "agendado",
      cliente_nome: a.cliente,
      criado_em: criadoHoje(...a.hora),
    }))
  );
  if (hojeError) throw hojeError;
  console.log(`${atendimentosHoje.length} atendimentos de hoje lançados (pendentes de fechar).`);

  // --- Despesas soltas ---
  await supabase.from("expenses").insert([
    {
      org_id: org.id,
      descricao: "Aluguel do salão",
      categoria: "aluguel",
      valor: 1800,
      data: hoje.toISOString().slice(0, 10),
      recorrente: true,
    },
    {
      org_id: org.id,
      descricao: "Produtos de higiene e styling",
      categoria: "produtos",
      valor: 320,
      data: hoje.toISOString().slice(0, 10),
      recorrente: false,
    },
    {
      org_id: org.id,
      descricao: "Internet + telefone",
      categoria: "internet",
      valor: 150,
      data: hoje.toISOString().slice(0, 10),
      recorrente: true,
    },
  ]);
  console.log("Despesas de exemplo lançadas.");

  console.log("\n=== Demo pronta ===");
  console.log("Barbearia:", org.nome);
  console.log("Código de acesso:", codigoAcesso);
  console.log("Admin:", admin.nome, "PIN 1234");
  console.log("Barbeiro:", lucas.nome, "PIN 5678 (comissão 50%)");
  console.log("Barbeiro:", rafael.nome, "PIN 4321 (comissão fixa R$15/corte)");
}

main().catch((err) => {
  console.error("Erro no seed-demo:", err.message);
  process.exit(1);
});
