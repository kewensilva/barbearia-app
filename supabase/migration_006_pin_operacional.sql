-- =========================================================
-- Migração: PIN operacional separado, usado só pra desbloquear
-- a tela de lançar atendimento quando "somente admin lança"
-- está ativo — não dá acesso a relatório/despesas/configurações/
-- usuários/serviços/fechamentos.
-- =========================================================

alter table organizations
  add column if not exists pin_operacional_hash text,
  add column if not exists pin_operacional_tentativas_falhas int not null default 0,
  add column if not exists pin_operacional_bloqueado_ate timestamptz;
