"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FormaPagamento = "dinheiro" | "pix" | "cartao";
type Servico = { id: string; nome: string; preco: number };
type Atendimento = {
  id: string;
  valor_cobrado: number;
  forma_pagamento: FormaPagamento;
  criado_em: string;
  cliente_nome: string | null;
  services: { nome: string } | null;
};

export default function Lancamento() {
  return (
    <Suspense fallback={<main />}>
      <LancamentoContent />
    </Suspense>
  );
}

function LancamentoContent() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";

  const [nomeUsuario, setNomeUsuario] = useState("");
  const [roleUsuario, setRoleUsuario] = useState<"admin" | "barber" | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [pagamento, setPagamento] = useState<FormaPagamento | null>(null);
  const [origem, setOrigem] = useState<"agendado" | "encaixe">("agendado");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [meusAtendimentos, setMeusAtendimentos] = useState<Atendimento[]>([]);
  const [mostrarNomeCliente, setMostrarNomeCliente] = useState(false);
  const [clienteNome, setClienteNome] = useState("");

  function carregarMeusAtendimentos() {
    if (!usuarioId) return;
    fetch(`/api/atendimentos?barbeiro=${usuarioId}`)
      .then((r) => r.json())
      .then(setMeusAtendimentos)
      .catch(() => {});
  }

  useEffect(() => {
    fetch("/api/servicos")
      .then((r) => r.json())
      .then(setServicos)
      .catch(() => setErro("Não foi possível carregar os serviços"));

    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((usuarios: { id: string; nome: string; role: "admin" | "barber" }[]) => {
        const atual = usuarios.find((u) => u.id === usuarioId);
        setNomeUsuario(atual?.nome ?? "");
        setRoleUsuario(atual?.role ?? null);
      });

    fetch("/api/organizacao")
      .then((r) => r.json())
      .then((dados) => setMostrarNomeCliente(Boolean(dados.mostrarNomeCliente)))
      .catch(() => {});

    carregarMeusAtendimentos();
  }, [usuarioId]);

  const totalHoje = meusAtendimentos.reduce((soma, a) => soma + a.valor_cobrado, 0);

  const podeConfirmar = servicoId && pagamento && !salvando;

  async function confirmar() {
    if (!servicoId || !pagamento) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/atendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId,
          servicoId,
          formaPagamento: pagamento,
          origem,
          clienteNome: mostrarNomeCliente ? clienteNome : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setSalvo(true);
      carregarMeusAtendimentos();
      setTimeout(() => {
        setSalvo(false);
        setServicoId(null);
        setPagamento(null);
        setClienteNome("");
      }, 1200);
    } catch {
      setErro("Não foi possível lançar o atendimento, tente de novo");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main>
      <div className="row">
        <div>
          <h1>Novo atendimento</h1>
          <p className="subtitle">{nomeUsuario}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {roleUsuario === "admin" && (
            <button
              className="tag"
              style={{ border: "none", cursor: "pointer" }}
              onClick={() => router.push(`/caixa?usuario=${usuarioId}`)}
            >
              ver caixa
            </button>
          )}
          <button
            className="tag"
            style={{ border: "none", cursor: "pointer" }}
            onClick={() => router.push("/")}
          >
            trocar usuário
          </button>
        </div>
      </div>

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}

      <p className="subtitle" style={{ marginBottom: 8 }}>Serviço</p>
      {servicos.map((s) => (
        <button
          key={s.id}
          className={`service-btn ${servicoId === s.id ? "selected" : ""}`}
          onClick={() => setServicoId(s.id)}
        >
          <span>{s.nome}</span>
          <span>R$ {s.preco.toFixed(2)}</span>
        </button>
      ))}

      <p className="subtitle" style={{ marginBottom: 8, marginTop: 20 }}>
        Forma de pagamento
      </p>
      <div className="row" style={{ gap: 8 }}>
        {(["dinheiro", "pix", "cartao"] as FormaPagamento[]).map((f) => (
          <button
            key={f}
            className={`pay-btn ${pagamento === f ? "selected" : ""}`}
            onClick={() => setPagamento(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <p className="subtitle" style={{ marginBottom: 8, marginTop: 20 }}>
        Origem
      </p>
      <div className="row" style={{ gap: 8 }}>
        <button
          className={`pay-btn ${origem === "agendado" ? "selected" : ""}`}
          onClick={() => setOrigem("agendado")}
        >
          agendado
        </button>
        <button
          className={`pay-btn ${origem === "encaixe" ? "selected" : ""}`}
          onClick={() => setOrigem("encaixe")}
        >
          encaixe
        </button>
      </div>

      {mostrarNomeCliente && (
        <>
          <p className="subtitle" style={{ marginBottom: 8, marginTop: 20 }}>
            Nome do cliente (opcional)
          </p>
          <input
            className="input"
            placeholder="Nome do cliente"
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
          />
        </>
      )}

      <button
        className="primary-btn"
        disabled={!podeConfirmar}
        onClick={confirmar}
      >
        {salvo ? "Lançado ✓" : salvando ? "Lançando..." : "Confirmar atendimento"}
      </button>

      <p className="section-label">Meus atendimentos hoje</p>
      <div className="card">
        <div className="row">
          <p className="subtitle" style={{ marginBottom: 0 }}>Total</p>
          <div style={{ fontWeight: 700 }}>R$ {totalHoje.toFixed(2)}</div>
        </div>
      </div>
      <div className="card">
        {meusAtendimentos.length === 0 && (
          <p className="subtitle">Nenhum atendimento hoje ainda</p>
        )}
        {meusAtendimentos.map((a) => (
          <div key={a.id} className="tx-item">
            <div>
              <div>
                {a.services?.nome}
                {a.cliente_nome ? ` · ${a.cliente_nome}` : ""}
              </div>
              <div className="subtitle" style={{ marginBottom: 0 }}>
                {new Date(a.criado_em).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {a.forma_pagamento}
              </div>
            </div>
            <div>R$ {a.valor_cobrado.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
