// Dados mock só para o esqueleto rodar sem banco ligado ainda.
// Trocar por chamadas reais ao Supabase (lib/supabase.ts) na Fase 1 do roadmap.

export type Usuario = {
  id: string;
  nome: string;
  role: "admin" | "barber";
};

export type Servico = {
  id: string;
  nome: string;
  preco: number;
};

export type Atendimento = {
  id: string;
  barbeiroId: string;
  barbeiroNome: string;
  servicoNome: string;
  valor: number;
  formaPagamento: "dinheiro" | "pix" | "cartao";
  horario: string;
};

export const usuarios: Usuario[] = [
  { id: "u1", nome: "Carlos (dono)", role: "admin" },
  { id: "u2", nome: "Jonas (contratado)", role: "barber" },
];

export const servicos: Servico[] = [
  { id: "s1", nome: "Corte", preco: 45 },
  { id: "s2", nome: "Barba", preco: 25 },
  { id: "s3", nome: "Corte + Barba", preco: 60 },
];

export const atendimentosDoDia: Atendimento[] = [
  {
    id: "t1",
    barbeiroId: "u1",
    barbeiroNome: "Carlos (dono)",
    servicoNome: "Corte",
    valor: 45,
    formaPagamento: "pix",
    horario: "09:15",
  },
  {
    id: "t2",
    barbeiroId: "u2",
    barbeiroNome: "Jonas (contratado)",
    servicoNome: "Corte + Barba",
    valor: 60,
    formaPagamento: "dinheiro",
    horario: "09:40",
  },
];
