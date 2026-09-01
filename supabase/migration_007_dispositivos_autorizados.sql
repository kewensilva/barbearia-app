-- =========================================================
-- Migração: dispositivos autorizados a lançar atendimento.
-- Quando "somente admin lança" está ativo, o lançamento só é
-- aceito se vier de um dispositivo autorizado pelo admin —
-- mesmo que a pessoa tenha o PIN certo (operacional ou pessoal).
-- =========================================================

create table if not exists authorized_devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id text not null,
  nome text,
  criado_em timestamptz not null default now(),
  unique (org_id, device_id)
);

alter table authorized_devices enable row level security;

create policy org_isolation_authorized_devices on authorized_devices
  using (org_id = current_org_id());
