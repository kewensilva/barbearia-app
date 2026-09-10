import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarDataBrasil, limitesDoDiaBrasil } from "./data.ts";

test("formatarDataBrasil não pula pro dia seguinte à noite (UTC-3)", () => {
  // 22h37 em Brasília (UTC-3) no dia 9 = 01h37 UTC do dia 10
  const instanteNoiteBrasil = new Date("2026-09-10T01:37:00.000Z");
  assert.equal(formatarDataBrasil(instanteNoiteBrasil), "2026-09-09");
});

test("formatarDataBrasil de manhã bate com o dia em UTC também", () => {
  const instanteManha = new Date("2026-09-09T13:00:00.000Z");
  assert.equal(formatarDataBrasil(instanteManha), "2026-09-09");
});

test("limitesDoDiaBrasil cobre um atendimento lançado às 22h37 de Brasília", () => {
  const { inicio, fim } = limitesDoDiaBrasil("2026-09-09");
  const criadoEm = new Date("2026-09-10T01:37:00.000Z").toISOString();
  assert.ok(criadoEm >= inicio && criadoEm <= fim);
});

test("limitesDoDiaBrasil não inclui o dia seguinte", () => {
  const { fim } = limitesDoDiaBrasil("2026-09-09");
  const criadoEmDiaSeguinte = new Date("2026-09-10T03:00:00.000Z").toISOString();
  assert.ok(criadoEmDiaSeguinte > fim);
});
