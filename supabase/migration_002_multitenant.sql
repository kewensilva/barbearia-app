-- =========================================================
-- Migração: multi-tenant real (código de acesso por barbearia)
-- + parametrização de "nome do cliente" no atendimento
-- Rodar uma vez no SQL Editor do Supabase antes do deploy do
-- código que depende destas colunas.
-- =========================================================

alter table organizations
  add column if not exists codigo_acesso text,
  add column if not exists mostrar_nome_cliente boolean not null default false;

create unique index if not exists organizations_codigo_acesso_key
  on organizations (codigo_acesso);

alter table transactions
  add column if not exists cliente_nome text;
