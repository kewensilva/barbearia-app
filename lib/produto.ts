// Calcula o valor e a comissão do produto vendido junto com o atendimento.
// Cortesia zera tudo (nem o produto é cobrado nesse caso).
export function calcularVendaProduto(
  precoProduto: number,
  comissaoPercentual: number | null,
  formaPagamento: string
): { valorProduto: number; comissaoProduto: number } {
  if (formaPagamento === "cortesia") {
    return { valorProduto: 0, comissaoProduto: 0 };
  }
  const valorProduto = Math.round(precoProduto * 100) / 100;
  const comissaoProduto = comissaoPercentual
    ? Math.round(((valorProduto * comissaoPercentual) / 100) * 100) / 100
    : 0;
  return { valorProduto, comissaoProduto };
}
