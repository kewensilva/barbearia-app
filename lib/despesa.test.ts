import { test } from "node:test";
import assert from "node:assert/strict";
import { categoriaPermitida, rotuloCategoria } from "./despesa.ts";

test("barbeiro pode lançar produtos, manutenção e outros", () => {
  assert.ok(categoriaPermitida("produtos", true));
  assert.ok(categoriaPermitida("manutencao", true));
  assert.ok(categoriaPermitida("outros", true));
});

test("barbeiro não lança aluguel, energia ou internet da barbearia", () => {
  assert.equal(categoriaPermitida("aluguel", true), false);
  assert.equal(categoriaPermitida("energia", true), false);
  assert.equal(categoriaPermitida("internet", true), false);
});

test("despesa da barbearia aceita todas as categorias manuais", () => {
  assert.ok(categoriaPermitida("aluguel", false));
  assert.ok(categoriaPermitida("manutencao", false));
});

test("comissão nunca é lançada à mão", () => {
  assert.equal(categoriaPermitida("comissao", false), false);
  assert.equal(categoriaPermitida("comissao", true), false);
});

test("rótulo com acento para exibição", () => {
  assert.equal(rotuloCategoria("manutencao"), "manutenção");
  assert.equal(rotuloCategoria("produtos"), "produtos");
});
