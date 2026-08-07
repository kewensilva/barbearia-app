# Projeto: Fluxo de Caixa para Barbearia (MVP)

Leia `/docs/plano-mvp.md` inteiro antes de qualquer alteração — ele é a fonte da verdade de regras de negócio.

## Stack
- Next.js (App Router, TypeScript)
- Supabase (Postgres + Auth + Row Level Security)
- Deploy: Vercel
- Mobile-first, PWA instalável (sem app nativo no MVP)

## Multi-tenant
Todo dado pertence a uma `organization` (`org_id`). Nunca escrever uma query sem filtrar por `org_id`. As políticas RLS em `supabase/schema.sql` são a barreira de segurança principal — qualquer tabela nova precisa de política RLS antes de ir pra produção.

## Autenticação: PIN, não login tradicional
- Um dispositivo fica "logado" na organização (sessão de longa duração, tipo dispositivo de balcão)
- Cada usuário se identifica por PIN de 4 dígitos (hash com bcrypt, nunca texto puro)
- Ações sensíveis (despesas, fechamento, relatórios) pedem confirmação de PIN mesmo com usuário já identificado
- Detalhes completos do fluxo em `docs/plano-mvp.md`, seção 6

## Papéis
- `admin`: dono, vê tudo, cadastra despesas/serviços, configura comissão e periodicidade, fecha caixa
- `barber`: barbeiro contratado, só lança e vê os próprios atendimentos e comissão

## Convenções de código
- Componentes de tela: mobile-first, botões grandes (uso no balcão, muitas vezes com uma mão)
- Toda tela de lançamento de atendimento deve permitir concluir em no máximo 3 toques
- Cálculo de comissão e fechamento fica isolado em funções puras testáveis (não misturar com componentes de UI) — ver skill `fechamento-caixa`
- Datas sempre em UTC no banco, convertidas para exibição

## Ordem de implementação (ver roadmap completo em docs/plano-mvp.md)
1. Schema + RLS + seed de dados de teste
2. Tela de seleção de usuário + PIN
3. Lançamento de atendimento (tela principal)
4. Fluxo de caixa do dia (lista simples)
5. Configuração de comissão e periodicidade de fechamento
6. Tela de fechamento de caixa (pendente → pago) + geração automática de despesa
7. Cadastro de despesas
8. Relatório consolidado por período

## O que NÃO fazer no MVP
- Não construir agendamento de clientes (fora de escopo por enquanto)
- Não criar app nativo — PWA resolve
- Não guardar PIN em texto puro, nunca
- Não deixar nenhuma tabela sem política RLS
