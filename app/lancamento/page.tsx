"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FormaPagamento = "dinheiro" | "pix" | "cartao" | "cortesia";
type Servico = { id: string; nome: string; preco: number };
type Usuario = { id: string; nome: string; role: "admin" | "barber" };
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
  const modoOperacional = params.get("modo") === "operacional";

  const [nomeUsuario, setNomeUsuario] = useState("");
  const [roleUsuario, setRoleUsuario] = useState<"admin" | "barber" | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
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
  const [desconto, setDesconto] = useState("");
  const [somenteAdminLanca, setSomenteAdminLanca] = useState(false);
  const [atendenteId, setAtendenteId] = useState<string | null>(null);

  const precisaEscolherAtendente = somenteAdminLanca && roleUsuario === "admin";
  const bloqueadoParaBarbeiro = somenteAdminLanca && roleUsuario === "barber";
  const atendenteEfetivoId = precisaEscolherAtendente ? atendenteId : usuarioId;

  function carregarAtendimentosDe(id: string | null) {
    if (!id) {
      setMeusAtendimentos([]);
      return;
    }
    fetch(`/api/atendimentos?barbeiro=${id}`)
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
      .then((dados: Usuario[]) => {
        setUsuarios(dados);
        const atual = dados.find((u) => u.id === usuarioId);
        setNomeUsuario(atual?.nome ?? "");
        setRoleUsuario(atual?.role ?? null);
      });

    fetch("/api/organizacao")
      .then((r) => r.json())
      .then((dados) => {
        setMostrarNomeCliente(Boolean(dados.mostrarNomeCliente));
        setSomenteAdminLanca(Boolean(dados.somenteAdminLanca));
      })
      .catch(() => {});
  }, [usuarioId]);

  useEffect(() => {
    carregarAtendimentosDe(atendenteEfetivoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atendenteEfetivoId]);

  const totalHoje = meusAtendimentos.reduce((soma, a) => soma + a.valor_cobrado, 0);

  const servicoSelecionado = servicos.find((s) => s.id === servicoId);
  const descontoNumero = Number(desconto.replace(",", ".")) || 0;
  const valorFinal = servicoSelecionado
    ? Math.max(servicoSelecionado.preco - descontoNumero, 0)
    : 0;

  const precisaNomeCliente = mostrarNomeCliente || pagamento === "cortesia";
  const podeConfirmar =
    Boolean(atendenteEfetivoId) &&
    servicoId &&
    pagamento &&
    !salvando &&
    (pagamento !== "cortesia" || clienteNome.trim() !== "");

  async function confirmar() {
    if (!servicoId || !pagamento || !atendenteEfetivoId) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/atendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: atendenteEfetivoId,
          servicoId,
          formaPagamento: pagamento,
          origem,
          clienteNome: precisaNomeCliente ? clienteNome : undefined,
          desconto: descontoNumero > 0 ? descontoNumero : undefined,
        }),
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => null);
        throw new Error(dados?.erro);
      }
      setSalvo(true);
      carregarAtendimentosDe(atendenteEfetivoId);
      setTimeout(() => {
        setSalvo(false);
        setServicoId(null);
        setPagamento(null);
        setClienteNome("");
        setDesconto("");
      }, 1200);
    } catch (err) {
      setErro(err instanceof Error && err.message ? err.message : "Não foi possível lançar o atendimento, tente de novo");
    } finally {
      setSalvando(false);
    }
  }

  const atendentes = usuarios;
  const nomeAtendenteSelecionado = usuarios.find((u) => u.id === atendenteId)?.nome;

  return (
    <main>
      <div className="row">
        <div>
          <h1>Novo atendimento</h1>
          <p className="subtitle">{modoOperacional ? "Modo lançamento" : nomeUsuario}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {roleUsuario === "admin" && !modoOperacional && (
            <button
              className="tag"
              style={{ border: "none", cursor: "pointer" }}
              onClick={() => router.push(`/caixa?usuario=${usuarioId}`)}
            >
              ver caixa
            </button>
          )}
          {!modoOperacional && (
            <button
              className="tag"
              style={{ border: "none", cursor: "pointer" }}
              onClick={() => router.push(`/metricas?usuario=${usuarioId}`)}
            >
              métricas
            </button>
          )}
          <button
            className="tag"
            style={{ border: "none", cursor: "pointer" }}
            onClick={() => {
              fetch("/api/dispositivo", { method: "DELETE" }).finally(() => router.push("/"));
            }}
          >
            {modoOperacional ? "voltar" : "trocar usuário"}
          </button>
        </div>
      </div>

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}

      {bloqueadoParaBarbeiro ? (
        <div className="card">
          <p style={{ marginBottom: 12 }}>
            Nesta barbearia, os atendimentos são lançados pelo admin. Avise o dono pra registrar
            o seu atendimento.
          </p>
          <button
            className="primary-btn"
            style={{ marginTop: 0 }}
            onClick={() => router.push(`/metricas?usuario=${usuarioId}`)}
          >
            Ver meu relatório de atendimentos e comissão
          </button>
        </div>
      ) : (
        <>
          {precisaEscolherAtendente && (
            <>
              <p className="subtitle" style={{ marginBottom: 8 }}>Atendente</p>
              {atendentes.map((a) => (
                <button
                  key={a.id}
                  className={`service-btn ${atendenteId === a.id ? "selected" : ""}`}
                  onClick={() => setAtendenteId(a.id)}
                >
                  <span>{a.nome}</span>
                  <span></span>
                </button>
              ))}
            </>
          )}

          <p className="subtitle" style={{ marginBottom: 8, marginTop: 20 }}>Serviço</p>
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

          {servicoSelecionado && pagamento !== "cortesia" && (
            <>
              <p className="subtitle" style={{ marginBottom: 8, marginTop: 20 }}>
                Desconto (R$, opcional)
              </p>
              <input
                className="input"
                inputMode="decimal"
                placeholder="Ex: 10"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
              />
              {descontoNumero > 0 && (
                <p className="subtitle" style={{ marginTop: -8 }}>
                  Valor final: R$ {valorFinal.toFixed(2)}
                </p>
              )}
            </>
          )}

          <p className="subtitle" style={{ marginBottom: 8, marginTop: 20 }}>
            Forma de pagamento
          </p>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {(["dinheiro", "pix", "cartao", "cortesia"] as FormaPagamento[]).map((f) => (
              <button
                key={f}
                className={`pay-btn ${pagamento === f ? "selected" : ""}`}
                style={{ flex: "1 1 40%" }}
                onClick={() => setPagamento(f)}
              >
                {f}
              </button>
            ))}
          </div>
          {pagamento === "cortesia" && (
            <p className="subtitle" style={{ marginTop: 8, marginBottom: 0 }}>
              Cortesia: o serviço é dado de graça, não entra no valor arrecadado.
            </p>
          )}

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

          {precisaNomeCliente && (
            <>
              <p className="subtitle" style={{ marginBottom: 8, marginTop: 20 }}>
                {pagamento === "cortesia" ? "Nome do cliente (obrigatório)" : "Nome do cliente (opcional)"}
              </p>
              <input
                className="input"
                placeholder="Nome do cliente"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
              />
            </>
          )}

          <button className="primary-btn" disabled={!podeConfirmar} onClick={confirmar}>
            {salvo ? "Lançado ✓" : salvando ? "Lançando..." : "Confirmar atendimento"}
          </button>
        </>
      )}

      <p className="section-label">
        {precisaEscolherAtendente
          ? `Atendimentos de ${nomeAtendenteSelecionado ?? "—"} hoje`
          : "Meus atendimentos hoje"}
      </p>
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
