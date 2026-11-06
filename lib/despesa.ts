// Categorias que podem ser lançadas à mão. "comissao" fica de fora: só é
// gerada automaticamente ao pagar um fechamento.
export const CATEGORIAS_MANUAIS = [
  "aluguel",
  "energia",
  "internet",
  "produtos",
  "manutencao",
  "equipamentos",
  "outros",
] as const;

export type CategoriaManual = (typeof CATEGORIAS_MANUAIS)[number];

// O barbeiro não paga aluguel/energia de uma barbearia que não é dele: as
// despesas dele são só do próprio trabalho. Em "outros" ele descreve o que
// quiser no campo de descrição.
export const CATEGORIAS_BARBEIRO = ["produtos", "manutencao", "outros"] as const satisfies readonly CategoriaManual[];

export function categoriaPermitida(categoria: unknown, ehDespesaDeBarbeiro: boolean): boolean {
  const lista: readonly string[] = ehDespesaDeBarbeiro ? CATEGORIAS_BARBEIRO : CATEGORIAS_MANUAIS;
  return typeof categoria === "string" && lista.includes(categoria);
}

const ROTULOS: Record<string, string> = {
  manutencao: "manutenção",
  comissao: "comissão",
};

export function rotuloCategoria(categoria: string): string {
  return ROTULOS[categoria] ?? categoria;
}
