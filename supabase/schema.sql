-- =========================================================
-- Fluxo de Caixa Barbearia — schema inicial (MVP)
-- Multi-tenant via org_id + Row Level Security
-- =========================================================

create extension if not exists "pgcrypto";

create table organizations (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  nome text not null,
  role text not null check (role in ('admin', 'barber')),
  pin_hash text not null,          -- bcrypt hash do PIN de 4 dígitos, nunca texto puro
  pin_tentativas_falhas int not null default 0,
  pin_bloqueado_ate timestamptz,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  nome text not null,
  preco numeric(10,2) not null,
  ativo boolean not null default true
);

create table commission_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  barber_id uuid not null references users(id) on delete cascade,
  tipo text not null check (tipo in ('percentual', 'fixo')),
  valor numeric(10,2) not null,     -- percentual (ex 50.00) ou valor fixo em R$
  vigente_desde timestamptz not null default now()
);

create table closing_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  barber_id uuid not null references users(id) on delete cascade,
  periodicidade text not null check (periodicidade in ('diario', 'semanal', 'quinzenal', 'mensal')),
  dia_referencia int  -- dia da semana (0-6) ou do mês (1-31), conforme periodicidade
);

create table closings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  barber_id uuid not null references users(id) on delete cascade,
  periodo_inicio timestamptz not null,
  periodo_fim timestamptz not null,
  total_bruto numeric(10,2) not null default 0,
  total_comissao numeric(10,2) not null default 0,
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  pago_em timestamptz,
  criado_em timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  barber_id uuid not null references users(id) on delete cascade,
  service_id uuid references services(id),
  valor_cobrado numeric(10,2) not null,
  forma_pagamento text not null check (forma_pagamento in ('dinheiro', 'pix', 'cartao')),
  origem text not null default 'agendado' check (origem in ('agendado', 'encaixe')),
  closing_id uuid references closings(id),   -- null até ser fechado
  criado_em timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  descricao text not null,
  categoria text not null check (categoria in ('aluguel', 'energia', 'internet', 'produtos', 'comissao', 'outros')),
  valor numeric(10,2) not null,
  data date not null,
  recorrente boolean not null default false,
  closing_id uuid references closings(id),   -- preenchido quando gerada automaticamente por um fechamento
  criado_em timestamptz not null default now()
);

-- =========================================================
-- Row Level Security
-- Estratégia: sessão da aplicação carrega org_id atual via
-- claim customizada (ex: auth.jwt() ->> 'org_id') definida
-- no momento em que o dispositivo se autentica na organização.
-- Ajustar a função abaixo conforme a estratégia de auth escolhida.
-- =========================================================

alter table organizations enable row level security;
alter table users enable row level security;
alter table services enable row level security;
alter table commission_settings enable row level security;
alter table closing_settings enable row level security;
alter table closings enable row level security;
alter table transactions enable row level security;
alter table expenses enable row level security;

create or replace function current_org_id() returns uuid as $$
  select (auth.jwt() ->> 'org_id')::uuid
$$ language sql stable;

-- Política padrão: só enxerga/edita linhas da própria organização
create policy org_isolation_users on users
  using (org_id = current_org_id());

create policy org_isolation_services on services
  using (org_id = current_org_id());

create policy org_isolation_commission_settings on commission_settings
  using (org_id = current_org_id());

create policy org_isolation_closing_settings on closing_settings
  using (org_id = current_org_id());

create policy org_isolation_closings on closings
  using (org_id = current_org_id());

create policy org_isolation_transactions on transactions
  using (org_id = current_org_id());

create policy org_isolation_expenses on expenses
  using (org_id = current_org_id());

-- TODO antes de produção:
-- 1. Restringir 'expenses', 'closings' e 'commission_settings' a role = admin
--    (política adicional checando users.role via join, ou claim 'role' no JWT)
-- 2. Restringir update/delete de 'transactions' a: só o próprio barbeiro
--    e só enquanto closing_id for null (após fechado, vira imutável)
-- 3. Índices: (org_id, barber_id, criado_em) em transactions para consultas de período
