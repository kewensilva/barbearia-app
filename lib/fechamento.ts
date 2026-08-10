// Cálculo de comissão isolado de UI/banco — puro e testável.
export type ComissaoConfig = { tipo: "percentual" | "fixo"; valor: number } | null;

export function calcularComissao(
  totalBruto: number,
  quantidadeAtendimentos: number,
  comissao: ComissaoConfig
): number {
  if (!comissao) return 0;
  if (comissao.tipo === "percentual") {
    return arredondar((totalBruto * comissao.valor) / 100);
  }
  return arredondar(comissao.valor * quantidadeAtendimentos);
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}
