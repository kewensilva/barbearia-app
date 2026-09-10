-- =========================================================
-- Migração: cadastro de produtos (venda junto com o atendimento)
-- Sem controle de estoque — só nome, preço e comissão opcional.
-- =========================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  nome text not null,
  preco numeric(10,2) not null,
  comissao_percentual numeric(5,2),  -- null = sem comissão nesse produto
  ativo boolean not null default true
);

alter table products enable row level security;

create policy org_isolation_products on products
  using (org_id = current_org_id());

alter table transactions
  add column if not exists product_id uuid references products(id),
  add column if not exists valor_produto numeric(10,2),
  add column if not exists comissao_produto numeric(10,2);
