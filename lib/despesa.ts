// Categorias que podem ser lançadas à mão. "comissao" fica de fora: só é
// gerada automaticamente ao pagar um fechamento.
export const CATEGORIAS_MANUAIS = [
  "aluguel",
  "energia",
  "internet",
  "produtos",
  "equipamentos",
  "outros",
] as const;

export type CategoriaManual = (typeof CATEGORIAS_MANUAIS)[number];
