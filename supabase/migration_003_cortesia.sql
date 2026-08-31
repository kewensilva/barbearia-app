-- =========================================================
-- Migração: forma de pagamento "cortesia" (atendimento sem cobrança)
-- Rodar uma vez no SQL Editor do Supabase antes do deploy do
-- código que depende disso.
-- =========================================================

alter table transactions
  drop constraint if exists transactions_forma_pagamento_check;

alter table transactions
  add constraint transactions_forma_pagamento_check
  check (forma_pagamento in ('dinheiro', 'pix', 'cartao', 'cortesia'));
