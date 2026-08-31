-- =========================================================
-- Migração: admin pode desligar a exigência de PIN nas áreas
-- administrativas (relatório, configurações, fechamentos,
-- despesas, usuários, serviços).
-- =========================================================

alter table organizations
  add column if not exists pin_areas_sensiveis boolean not null default true;
