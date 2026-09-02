// Calcula o valor final cobrado a partir do preço de tabela do serviço e um
// desconto opcional em reais. Nunca fica negativo; cortesia sempre zera.
export function calcularValorComDesconto(
  precoServico: number,
  desconto: number | undefined,
  formaPagamento: string
): number {
  if (formaPagamento === "cortesia") return 0;
  const descontoValido = typeof desconto === "number" && desconto > 0 ? desconto : 0;
  const valor = precoServico - descontoValido;
  return Math.round(Math.max(valor, 0) * 100) / 100;
}
