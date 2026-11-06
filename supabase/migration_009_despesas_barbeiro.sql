-- =========================================================
-- Migração: despesas por barbeiro.
-- Cada despesa pode pertencer a um barbeiro (quem comprou a
-- máquina, o shampoo...) ou à barbearia (barber_id null).
-- Continua sendo saída do caixa geral — não mexe na comissão.
-- Também adiciona as categorias "manutencao" e "equipamentos".
-- Despesa de barbeiro só aceita produtos, manutencao e outros
-- (validado na API, ver lib/despesa.ts).
-- =========================================================

alter table expenses
  add column if not exists barber_id uuid references users(id);

create index if not exists expenses_org_barber_data_idx
  on expenses (org_id, barber_id, data);

alter table expenses
  drop constraint if exists expenses_categoria_check;

alter table expenses
  add constraint expenses_categoria_check
  check (categoria in ('aluguel', 'energia', 'internet', 'produtos', 'manutencao', 'equipamentos', 'comissao', 'outros'));
