// A barbearia opera no horário do Brasil, mas o banco guarda tudo em UTC
// (timestamptz) e o servidor (Vercel) roda em UTC. Sem isso, "hoje" calculado
// via new Date().toISOString() vira o dia seguinte a partir das 21h em
// Brasília (UTC-3), fazendo atendimentos "sumirem" pro dia errado.
const FUSO_HORARIO = "America/Sao_Paulo";
const OFFSET = "-03:00"; // Brasil não tem mais horário de verão desde 2019

// Funciona tanto no servidor quanto no navegador — Intl.DateTimeFormat com
// timeZone explícito ignora o fuso local de quem está rodando o código.
export function formatarDataBrasil(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_HORARIO }).format(d);
}

export function hojeBrasil(): string {
  return formatarDataBrasil(new Date());
}

export function limitesDoDiaBrasil(dataYMD: string): { inicio: string; fim: string } {
  return {
    inicio: new Date(`${dataYMD}T00:00:00.000${OFFSET}`).toISOString(),
    fim: new Date(`${dataYMD}T23:59:59.999${OFFSET}`).toISOString(),
  };
}
