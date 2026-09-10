"use client";

import { useState } from "react";

export type FormaPagamento = "dinheiro" | "pix" | "cartao" | "cortesia";
export type Servico = { id: string; nome: string; preco: number };
export type Produto = { id: string; nome: string; preco: number };
export type Atendimento = {
  id: string;
  valor_cobrado: number;
  valor_produto: number | null;
  forma_pagamento: FormaPagamento;
  origem: "agendado" | "encaixe";
  criado_em: string;
  cliente_nome: string | null;
  closing_id: string | null;
  service_id: string;
  product_id: string | null;
  users: { nome: string } | null;
  services: { nome: string } | null;
  products: { nome: string } | null;
};

export function AtendimentoItem({
  atendimento,
  servicos,
  produtos,
  onAlterado,
}: {
  atendimento: Atendimento;
  servicos: Servico[];
  produtos: Produto[];
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
  const [produtoId, setProdutoId] = useState<string | null>(atendimento.product_id);
  const [valorProduto, setValorProduto] = useState(
    atendimento.valor_produto != null ? String(atendimento.valor_produto) : ""
  );

  const fechado = Boolean(atendimento.closing_id);
  const valorNumero = Number(valorCobrado.replace(",", "."));
  const valorProdutoNumero = Number(valorProduto.replace(",", "."));
  const podeSalvar =
    !Number.isNaN(valorNumero) &&
    valorNumero >= 0 &&
    (!produtoId || (!Number.isNaN(valorProdutoNumero) && valorProdutoNumero >= 0)) &&
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
        produtoId,
        valorProduto: produtoId ? valorProdutoNumero : undefined,
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

        <p className="section-label">Valor cobrado do serviço (R$)</p>
        <input
          className="input"
          inputMode="decimal"
          disabled={formaPagamento === "cortesia"}
          value={formaPagamento === "cortesia" ? "0" : valorCobrado}
          onChange={(e) => setValorCobrado(e.target.value)}
        />

        <p className="section-label">Produto vendido junto</p>
        <select
          className="input"
          value={produtoId ?? ""}
          onChange={(e) => {
            const novoId = e.target.value || null;
            setProdutoId(novoId);
            const produto = produtos.find((p) => p.id === novoId);
            if (produto) setValorProduto(String(produto.preco));
          }}
        >
          <option value="">Nenhum</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        {produtoId && (
          <>
            <p className="section-label">Valor do produto (R$)</p>
            <input
              className="input"
              inputMode="decimal"
              disabled={formaPagamento === "cortesia"}
              value={formaPagamento === "cortesia" ? "0" : valorProduto}
              onChange={(e) => setValorProduto(e.target.value)}
            />
          </>
        )}

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
            {atendimento.products?.nome ? ` + ${atendimento.products.nome}` : ""}
            {atendimento.cliente_nome ? ` · ${atendimento.cliente_nome}` : ""}
          </div>
          <div className="subtitle" style={{ marginBottom: 0 }}>
            {atendimento.users?.nome} ·{" "}
            {new Date(atendimento.criado_em).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {atendimento.forma_pagamento}
          </div>
        </div>
        <div>R$ {(atendimento.valor_cobrado + (atendimento.valor_produto ?? 0)).toFixed(2)}</div>
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
