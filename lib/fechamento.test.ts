import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularComissao } from "./fechamento.ts";

test("comissão percentual", () => {
  assert.equal(calcularComissao(200, 4, { tipo: "percentual", valor: 50 }), 100);
});

test("comissão fixa por atendimento", () => {
  assert.equal(calcularComissao(200, 4, { tipo: "fixo", valor: 15 }), 60);
});

test("sem configuração de comissão retorna 0", () => {
  assert.equal(calcularComissao(200, 4, null), 0);
});

test("arredonda para 2 casas decimais", () => {
  assert.equal(calcularComissao(100, 3, { tipo: "percentual", valor: 33.333 }), 33.33);
});
