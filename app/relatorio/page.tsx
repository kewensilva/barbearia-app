"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AtendimentoItem, type Atendimento, type Servico, type Produto } from "@/app/components/AtendimentoItem";
import { formatarDataBrasil } from "@/lib/data";

type Preset = "hoje" | "semana" | "mes" | "custom";

type Relatorio = {
  entradas: number;
  saidas: number;
  saldo: number;
  comparativoBarbeiros: { nome: string; total: number; quantidade: number }[];
  despesasPorCategoria: { categoria: string; total: number }[];
  cortesias: {
    clienteNome: string | null;
    servicoNome: string | null;
    barbeiroNome: string | null;
    criadoEm: string;
  }[];
};

const formatarData = formatarDataBrasil;

function periodoDoPreset(preset: Preset): { inicio: string; fim: string } {
  const hoje = new Date();
  const fim = formatarData(hoje);

  if (preset === "hoje") return { inicio: fim, fim };

  if (preset === "semana") {
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - 6);
    return { inicio: formatarData(inicio), fim };
  }

  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return { inicio: formatarData(inicio), fim };
}

export default function Relatorio() {
  return (
    <Suspense fallback={<main />}>
      <RelatorioContent />
    </Suspense>
  );
}

function RelatorioContent() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";
  const [preset, setPreset] = useState<Preset>("mes");
  const [{ inicio, fim }, setPeriodo] = useState(periodoDoPreset("mes"));
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [atendimentosDetalhados, setAtendimentosDetalhados] = useState<Atendimento[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  function carregarAtendimentosDetalhados() {
    fetch(`/api/atendimentos?inicio=${inicio}&fim=${fim}`)
      .then((r) => r.json())
      .then(setAtendimentosDetalhados)
      .catch(() => { });
  }

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    fetch(`/api/relatorio?inicio=${inicio}&fim=${fim}`)
      .then((r) => r.json())
      .then((dados) => {
        if (dados.erro) throw new Error(dados.erro);
        setRelatorio(dados);
      })
      .catch(() => setErro("Não foi possível carregar o relatório"))
      .finally(() => setCarregando(false));

    carregarAtendimentosDetalhados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio, fim]);

  useEffect(() => {
    fetch("/api/servicos")
      .then((r) => r.json())
      .then(setServicos)
      .catch(() => { });
    fetch("/api/produtos")
      .then((r) => r.json())
      .then(setProdutos)
      .catch(() => { });
  }, []);

  function escolherPreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") setPeriodo(periodoDoPreset(p));
  }

  return (
    <main>
      <div className="row">
        <h1>Relatório</h1>
        <button
          className="tag"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => router.push(`/caixa?usuario=${usuarioId}`)}
        >
          voltar
        </button>
      </div>
      <p className="subtitle">Fluxo de caixa consolidado por período</p>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {(["hoje", "semana", "mes", "custom"] as Preset[]).map((p) => (
          <button
            key={p}
            className={`option-btn ${preset === p ? "selected" : ""}`}
            style={{ flex: "1 1 20%" }}
            onClick={() => escolherPreset(p)}
          >
            {{ hoje: "Hoje", semana: "7 dias", mes: "Este mês", custom: "Período" }[p]}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <input
            className="input"
            type="date"
            value={inicio}
            onChange={(e) => setPeriodo({ inicio: e.target.value, fim })}
          />
          <input
            className="input"
            type="date"
            value={fim}
            onChange={(e) => setPeriodo({ inicio, fim: e.target.value })}
          />
        </div>
      )}

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}
      {carregando && <p className="subtitle">Carregando...</p>}

      {relatorio && !carregando && (
        <>
          <div className="card">
            <div className="row">
              <div>
                <p className="subtitle" style={{ marginBottom: 0 }}>Entradas</p>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>
                  {relatorio.entradas.toLocaleString('pt-BR', {style:"currency", currency:"BRL"})}
                </div>
              </div>
              <div>
                <p className="subtitle" style={{ marginBottom: 0 }}>Saídas</p>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#dc2626" }}>
                   {relatorio.saidas.toLocaleString('pt-BR', {style:"currency", currency:"BRL"})}
                </div>
              </div>
            </div>
            <p className="subtitle" style={{ marginBottom: 0, marginTop: 12 }}>Saldo do período</p>
            <div className="total"> {relatorio.saldo.toLocaleString('pt-BR', {style:"currency", currency:"BRL"})}</div>
          </div>

          <p className="section-label">Comparativo entre barbeiros</p>
          <div className="card">
            {relatorio.comparativoBarbeiros.length === 0 && (
              <p className="subtitle">Nenhum atendimento no período</p>
            )}
            {relatorio.comparativoBarbeiros.map((b) => (
              <div key={b.nome} className="tx-item">
                <div>
                  <div>{b.nome}</div>
                  <div className="subtitle" style={{ marginBottom: 0 }}>
                    {b.quantidade} atendimento(s)
                  </div>
                </div>
                <div>{b.total.toLocaleString('pt-BR', {style:"currency", currency:"BRL"})}</div>
              </div>
            ))}
          </div>

          <p className="section-label">Despesas por categoria</p>
          <div className="card">
            {relatorio.despesasPorCategoria.length === 0 && (
              <p className="subtitle">Nenhuma despesa no período</p>
            )}
            {relatorio.despesasPorCategoria.map((c) => (
              <div key={c.categoria} className="tx-item">
                <div>{c.categoria}</div>
                <div>{c.total.toLocaleString('pt-BR', {style:"currency", currency:"BRL"})}</div>
              </div>
            ))}
          </div>

          <p className="section-label">
            Atendimentos detalhados do período ({atendimentosDetalhados.length})
          </p>
          <div className="card">
            {atendimentosDetalhados.length === 0 && (
              <p className="subtitle">Nenhum atendimento no período</p>
            )}
            {atendimentosDetalhados.map((a) => (
              <AtendimentoItem
                key={a.id}
                atendimento={a}
                servicos={servicos}
                produtos={produtos}
                onAlterado={carregarAtendimentosDetalhados}
              />
            ))}
          </div>

          <p className="section-label">Cortesias do período</p>
          <div className="card">
            {relatorio.cortesias.length === 0 && (
              <p className="subtitle">Nenhuma cortesia no período</p>
            )}
            {relatorio.cortesias.map((c, i) => (
              <div key={i} className="tx-item">
                <div>
                  <div>{c.clienteNome ?? "—"}</div>
                  <div className="subtitle" style={{ marginBottom: 0 }}>
                    {c.servicoNome} · {c.barbeiroNome} ·{" "}
                    {new Date(c.criadoEm).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
