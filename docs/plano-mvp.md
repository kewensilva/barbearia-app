# Plano MVP — Sistema de Fluxo de Caixa para Barbearia

## 1. Visão geral

Sistema web para gestão financeira de barbearias pequenas (1 dono/barbeiro + 1 barbeiro contratado, no máximo 3 usuários). Substitui o caderno de anotações por um registro digital de atendimentos, despesas, fechamento de caixa e cálculo automático de comissão.

**Importante desde já:** como você pretende vender isso para outras barbearias no futuro, o MVP já vai ser desenhado como **multi-tenant** (cada barbearia é uma "organização" isolada no banco de dados). Isso não atrasa o MVP — só exige uma coluna a mais (`org_id`) em cada tabela — mas evita ter que refazer tudo quando o segundo cliente aparecer.

## 2. Personas e papéis

| Papel | Quem é | O que faz no sistema |
|---|---|---|
| **Admin (dono)** | Dono da barbearia, também corta cabelo | Lança seus próprios atendimentos, cadastra despesas, configura comissão e periodicidade de fechamento, fecha o caixa, marca comissão como paga, vê relatórios completos |
| **Barbeiro contratado** | Presta serviço, recebe comissão por corte | Lança seus próprios atendimentos, vê seu extrato e comissão pendente/paga. **Não** vê despesas nem dados financeiros gerais da barbearia |

Sistema de permissões simples: `role = admin` ou `role = barber`.

## 3. Regras de negócio

### 3.1 Serviços e preços
Tabela de serviços cadastrável pelo admin: nome, preço, ativo/inativo.
Exemplo: Corte R$ 45,00 · Barba R$ 25,00 · Corte + Barba R$ 60,00.

### 3.2 Atendimentos (a "ficha" que hoje é o caderno)
Cada corte lançado registra: barbeiro que atendeu, serviço(s), valor cobrado (pode divergir da tabela — ex. desconto), forma de pagamento (dinheiro/pix/cartão — útil para conferência de caixa físico), data/hora, se veio de agendamento ou "encaixe".

### 3.3 Comissão
Configurável por barbeiro contratado: percentual fixo (ex. 50%) ou valor fixo por corte. Fica registrado no cadastro do barbeiro e pode ser alterado (com histórico, para não bagunçar cálculos retroativos).

### 3.4 Fechamento de caixa
Ponto central do sistema. O admin define a **periodicidade por barbeiro contratado**: diário, semanal, quinzenal ou mensal.

Um fechamento:
- Soma todos os atendimentos do barbeiro no período
- Calcula a comissão devida
- Gera um registro de "fechamento" com status `pendente` → `pago`
- Ao marcar como pago, opcionalmente gera automaticamente uma **despesa** da barbearia (categoria "Comissão"), para o fluxo de caixa geral bater certinho

O dono também pode fazer fechamento do seu próprio período (mesmo não recebendo comissão de si mesmo), só para saber quanto ele faturou.

### 3.5 Despesas
Cadastro simples: descrição, categoria (aluguel, energia, internet, produtos, comissão, outros), valor, data, recorrente (sim/não — se recorrente, pode ter dia fixo do mês).

### 3.6 Fluxo de caixa consolidado
Tela do admin mostrando: entradas (todos os atendimentos, de qualquer barbeiro) − saídas (despesas, incluindo comissões pagas) = saldo do período. Filtro por dia/semana/mês/personalizado.

## 4. Modelo de dados (simplificado)

```
organizations (id, nome, criado_em)

users (id, org_id, nome, email, role[admin|barber], pin, ativo)

commission_settings (id, org_id, barber_id, tipo[percentual|fixo], valor, vigente_desde)

closing_settings (id, org_id, barber_id, periodicidade[diario|semanal|quinzenal|mensal], dia_referencia)

services (id, org_id, nome, preco, ativo)

transactions (id, org_id, barber_id, service_id, valor_cobrado, forma_pagamento,
              origem[agendado|encaixe], criado_em, closing_id[nullable])

closings (id, org_id, barber_id, periodo_inicio, periodo_fim, total_bruto,
          total_comissao, status[pendente|pago], pago_em)

expenses (id, org_id, descricao, categoria, valor, data, recorrente, closing_id[nullable])
```

`closing_id` em `transactions` e `expenses` marca o que já foi "fechado", evitando contar duas vezes.

## 5. Fluxos principais

**Dia a dia:** barbeiro termina o corte → abre o app no celular ou no tablet do balcão → lança o atendimento em poucos toques (serviço + forma de pagamento, 10 segundos) → segue pro próximo cliente.

**Fechamento:** no dia configurado, admin vê "Fechamentos pendentes" → confere os lançamentos do período → confirma o fechamento → sistema calcula comissão → admin paga (dinheiro/pix, fora do sistema) → marca como pago → sistema lança despesa automaticamente.

**Relatório:** admin acessa "Fluxo de caixa" → escolhe período → vê entradas, saídas, saldo, comparativo entre barbeiros.

## 6. Acesso: PIN rápido (decidido)

Em vez de duas abas com sessões separadas (que dão conflito de cookie no mesmo navegador), o sistema usa **um único dispositivo logado** na organização, e cada usuário se identifica por **PIN de 4 dígitos** antes de lançar um atendimento ou acessar sua área — igual a um PDV de loja.

**Fluxo de tela:**
1. Tela inicial mostra os avatares/nomes dos usuários da barbearia (dono + barbeiro contratado)
2. Usuário toca no próprio nome → digita PIN de 4 dígitos
3. Cai direto na tela de lançamento rápido (o que ele mais usa no dia a dia)
4. Um botão "trocar usuário" sempre visível no topo, para o próximo barbeiro se identificar sem precisar de logout completo
5. Áreas restritas do admin (despesas, fechamento, relatórios) pedem o PIN novamente como confirmação extra, mesmo já estando "logado" como admin

**Regras do PIN:**
- 4 dígitos numéricos, definido no cadastro do usuário, pode ser alterado pelo próprio admin
- Guardado com hash (nunca em texto puro), mesmo sendo só 4 dígitos
- Após 5 tentativas erradas seguidas, bloqueia por alguns minutos (evita tentativa de força bruta num PIN curto)
- Sessão "ativa" (usuário identificado) expira sozinha após alguns minutos de inatividade, voltando pra tela de seleção de usuário

Isso resolve o caso de uso real: o tablet/computador fica fixo no balcão, e cada barbeiro só toca no nome dele e digita o PIN quando vai lançar um corte.

## 7. Arquitetura técnica recomendada

Para MVP rápido, barato e fácil de manter sozinho:

- **Frontend + Backend**: Next.js (React) — um projeto só, telas e API juntas
- **Banco de dados + Autenticação**: Supabase (Postgres gerenciado, login pronto, e Row Level Security para isolar cada barbearia/tenant automaticamente)
- **Hospedagem**: Vercel (deploy em minutos, plano gratuito cobre um MVP tranquilamente)
- **Mobile**: não precisa de app nativo — um site responsivo (PWA) já resolve, inclusive dá pra "instalar" como ícone no celular

Custo para rodar o MVP: praticamente R$ 0 até crescer bastante (planos gratuitos de Supabase + Vercel).

## 8. Roadmap do MVP (por fases)

**Fase 1 — Núcleo (1–2 semanas)**
- Login com PIN, cadastro de barbeiros e serviços
- Lançamento de atendimento (tela principal do dia a dia)
- Fluxo de caixa simples (lista de entradas do dia)

**Fase 2 — Fechamento e comissão (1 semana)**
- Configuração de comissão e periodicidade
- Tela de fechamento de caixa (pendente/pago)
- Geração automática de despesa ao pagar comissão

**Fase 3 — Despesas e relatórios (3–5 dias)**
- Cadastro de despesas (incluindo recorrentes)
- Relatório consolidado por período, gráfico simples de entradas x saídas

**Fase 4 — Polimento para venda a outros clientes**
- Onboarding de nova barbearia (criar organização, primeiro admin)
- Ajustes de UI, PWA instalável

## 9. Estrutura sugerida para construir isso com Claude Code

Se for construir com Claude Code, sugiro este esqueleto de projeto:

```
/barbearia-app
  CLAUDE.md                  ← instruções gerais do projeto (stack, convenções, este plano resumido)
  /docs
    plano-mvp.md              ← este documento
    modelo-dados.md
  /app                        ← Next.js
  /supabase
    schema.sql
    policies.sql               ← Row Level Security por org_id
  /skills
    fechamento-caixa/          ← skill com a lógica de cálculo de fechamento e comissão
    relatorio-financeiro/      ← skill para gerar os relatórios/exports
```

**Subagentes sugeridos** (para dividir o trabalho em sessões focadas):
- **agente-backend**: schema do banco, políticas de segurança (RLS), API/rotas
- **agente-frontend**: telas (lançamento, fechamento, despesas, relatório), sempre mobile-first
- **agente-qa**: testes dos cálculos de comissão e fechamento (é a parte que mais pode gerar bug silencioso — vale testar bem)
- **agente-deploy**: configuração Vercel + Supabase, variáveis de ambiente, checklist de deploy

Cada um trabalha com o `CLAUDE.md` e os docs em `/docs` como contexto compartilhado, evitando decisões inconsistentes entre eles.

## 10. Próximos passos

1. Validar esse plano — ajustar regras de negócio que eu possa ter simplificado demais
2. Definir: PIN de acesso ou login separado por aba?
3. Começar pela Fase 1 (núcleo)
