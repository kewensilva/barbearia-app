"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FormaPagamento = "dinheiro" | "pix" | "cartao" | "cortesia";
type Servico = { id: string; nome: string; preco: number };
type Atendimento = {
  id: string;
  valor_cobrado: number;
  forma_pagamento: FormaPagamento;
  origem: "agendado" | "encaixe";
  criado_em: string;
  cliente_nome: string | null;
  closing_id: string | null;
  service_id: string;
  users: { nome: string } | null;
  services: { nome: string } | null;
};

export default function Caixa() {
  return (
    <Suspense fallback={<main />}>
      <CaixaContent />
    </Suspense>
  );
}

function CaixaContent() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pinAreasSensiveis, setPinAreasSensiveis] = useState(true);

  function carregarAtendimentos() {
    fetch("/api/atendimentos")
      .then((r) => r.json())
      .then(setAtendimentos)
      .catch(() => setErro("Não foi possível carregar o caixa"))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarAtendimentos();

    fetch("/api/servicos")
      .then((r) => r.json())
      .then(setServicos)
      .catch(() => {});

    fetch("/api/organizacao")
      .then((r) => r.json())
      .then((dados) => setPinAreasSensiveis(dados.pinAreasSensiveis ?? true))
      .catch(() => {});
  }, []);

  const total = atendimentos.reduce((soma, a) => soma + a.valor_cobrado, 0);

  function irPara(destino: string) {
    router.push(
      pinAreasSensiveis
        ? `/confirmar-pin?usuario=${usuarioId}&destino=${destino}`
        : `${destino}?usuario=${usuarioId}`
    );
  }

  return (
    <main>
      <div className="row">
        <div>
          <h1>Fluxo de caixa</h1>
          <p className="subtitle">Hoje</p>
        </div>
        <button
          className="tag"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => {
            fetch("/api/dispositivo", { method: "DELETE" }).finally(() => router.push("/"));
          }}
        >
          trocar usuário
        </button>
      </div>

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}

      <div className="card">
        <p className="subtitle" style={{ marginBottom: 0 }}>Total do dia</p>
        <div className="total">R$ {total.toFixed(2)}</div>
      </div>

      <div className="card">
        {carregando && <p className="subtitle">Carregando...</p>}
        {!carregando && atendimentos.length === 0 && (
          <p className="subtitle">Nenhum atendimento hoje ainda</p>
        )}
        {atendimentos.map((a) => (
          <AtendimentoItem
            key={a.id}
            atendimento={a}
            servicos={servicos}
            onAlterado={carregarAtendimentos}
          />
        ))}
      </div>

      <button
        className="primary-btn"
        onClick={() => router.push(`/lancamento?usuario=${usuarioId}`)}
      >
        Novo atendimento
      </button>
      <button className="primary-btn" onClick={() => irPara("/fechamentos")}>
        Fechar caixa
      </button>
      <button
        className="primary-btn"
        style={{ background: "#78716c" }}
        onClick={() => irPara("/despesas")}
      >
        Lançar despesa
      </button>
      <button
        className="primary-btn"
        style={{ background: "#57534e" }}
        onClick={() => irPara("/relatorio")}
      >
        Relatório
      </button>
      <button
        className="primary-btn"
        style={{ background: "#a8a29e" }}
        onClick={() => irPara("/configuracoes")}
      >
        Configurações
      </button>
      <button
        className="primary-btn"
        style={{ background: "#a8a29e" }}
        onClick={() => irPara("/usuarios")}
      >
        Usuários
      </button>
      <button
        className="primary-btn"
        style={{ background: "#a8a29e" }}
        onClick={() => irPara("/servicos")}
      >
        Serviços
      </button>
    </main>
  );
}

function AtendimentoItem({
  atendimento,
  servicos,
  onAlterado,
}: {
  atendimento: Atendimento;
  servicos: Servico[];
  onAlterado: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [servicoId, setServicoId] = useState(atendimento.service_id);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>(atendimento.forma_pagamento);
  const [origem, setOrigem] = useState(atendimento.origem);
  const [clienteNome, setClienteNome] = useState(atendimento.cliente_nome ?? "");
  const [valorCobrado, setValorCobrado] = useState(String(atendimento.valor_cobrado));

  const fechado = Boolean(atendimento.closing_id);
  const valorNumero = Number(valorCobrado.replace(",", "."));
  const podeSalvar =
    !Number.isNaN(valorNumero) &&
    valorNumero >= 0 &&
    (formaPagamento !== "cortesia" || clienteNome.trim() !== "");

  async function salvar() {
    setProcessando(true);
    setErro(null);
    const res = await fetch(`/api/atendimentos/${atendimento.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        servicoId,
        formaPagamento,
        origem,
        clienteNome: clienteNome.trim() || undefined,
        valorCobrado: valorNumero,
      }),
    });
    if (!res.ok) {
      const dados = await res.json().catch(() => null);
      setErro(dados?.erro ?? "Não foi possível salvar");
      setProcessando(false);
      return;
    }
    setEditando(false);
    setProcessando(false);
    onAlterado();
  }

  async function excluir() {
    setProcessando(true);
    setErro(null);
    const res = await fetch(`/api/atendimentos/${atendimento.id}`, { method: "DELETE" });
    if (!res.ok) {
      const dados = await res.json().catch(() => null);
      setErro(dados?.erro ?? "Não foi possível excluir");
      setProcessando(false);
      return;
    }
    onAlterado();
  }

  if (editando) {
    return (
      <div className="card" style={{ marginBottom: 12 }}>
        {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}

        <p className="section-label" style={{ marginTop: 0 }}>Serviço</p>
        <select className="input" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>

        <p className="section-label">Forma de pagamento</p>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {(["dinheiro", "pix", "cartao", "cortesia"] as FormaPagamento[]).map((f) => (
            <button
              key={f}
              className={`option-btn ${formaPagamento === f ? "selected" : ""}`}
              style={{ flex: "1 1 40%" }}
              onClick={() => setFormaPagamento(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <p className="section-label">Origem</p>
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <button
            className={`option-btn ${origem === "agendado" ? "selected" : ""}`}
            onClick={() => setOrigem("agendado")}
          >
            agendado
          </button>
          <button
            className={`option-btn ${origem === "encaixe" ? "selected" : ""}`}
            onClick={() => setOrigem("encaixe")}
          >
            encaixe
          </button>
        </div>

        <input
          className="input"
          placeholder="Nome do cliente"
          value={clienteNome}
          onChange={(e) => setClienteNome(e.target.value)}
        />

        <p className="section-label">Valor cobrado (R$)</p>
        <input
          className="input"
          inputMode="decimal"
          disabled={formaPagamento === "cortesia"}
          value={formaPagamento === "cortesia" ? "0" : valorCobrado}
          onChange={(e) => setValorCobrado(e.target.value)}
        />

        <div className="row" style={{ gap: 8 }}>
          <button
            className="small-btn"
            style={{ flex: 1, background: "#a8a29e" }}
            onClick={() => setEditando(false)}
          >
            Cancelar
          </button>
          <button className="small-btn" style={{ flex: 1 }} disabled={!podeSalvar || processando} onClick={salvar}>
            {processando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
      <div className="row">
        <div>
          <div>
            {atendimento.services?.nome}
            {atendimento.cliente_nome ? ` · ${atendimento.cliente_nome}` : ""}
          </div>
          <div className="subtitle" style={{ marginBottom: 0 }}>
            {atendimento.users?.nome} ·{" "}
            {new Date(atendimento.criado_em).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {atendimento.forma_pagamento}
          </div>
        </div>
        <div>R$ {atendimento.valor_cobrado.toFixed(2)}</div>
      </div>

      {erro && <p className="subtitle" style={{ color: "#dc2626", marginBottom: 0 }}>{erro}</p>}

      {fechado ? (
        <p className="subtitle" style={{ marginBottom: 0 }}>Já fechado — não pode mais alterar</p>
      ) : confirmandoExcluir ? (
        <div className="row" style={{ gap: 8 }}>
          <p className="subtitle" style={{ marginBottom: 0, flex: 1 }}>Excluir esse atendimento?</p>
          <button
            className="small-btn"
            style={{ width: "auto", marginTop: 0, background: "#a8a29e" }}
            onClick={() => setConfirmandoExcluir(false)}
          >
            Cancelar
          </button>
          <button
            className="small-btn"
            style={{ width: "auto", marginTop: 0, background: "#dc2626" }}
            disabled={processando}
            onClick={excluir}
          >
            {processando ? "Excluindo..." : "Confirmar"}
          </button>
        </div>
      ) : (
        <div className="row" style={{ gap: 8 }}>
          <button
            className="small-btn"
            style={{ width: "auto", marginTop: 0 }}
            onClick={() => setEditando(true)}
          >
            Editar
          </button>
          <button
            className="small-btn"
            style={{ width: "auto", marginTop: 0, background: "#dc2626" }}
            onClick={() => setConfirmandoExcluir(true)}
          >
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}
