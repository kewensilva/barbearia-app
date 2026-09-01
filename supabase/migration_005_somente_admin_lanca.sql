-- =========================================================
-- Migração: opção de restringir o lançamento de atendimento
-- só ao usuário admin (selecionando o atendente na hora).
-- =========================================================

alter table organizations
  add column if not exists somente_admin_lanca boolean not null default false;
