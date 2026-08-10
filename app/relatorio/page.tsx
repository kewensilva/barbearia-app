"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Preset = "hoje" | "semana" | "mes" | "custom";

type Relatorio = {
  entradas: number;
  saidas: number;
  saldo: number;
  comparativoBarbeiros: { nome: string; total: number; quantidade: number }[];
  despesasPorCategoria: { categoria: string; total: number }[];
};

function formatarData(d: Date) {
  return d.toISOString().slice(0, 10);
}

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
  }, [inicio, fim]);

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
                  R$ {relatorio.entradas.toFixed(2)}
                </div>
              </div>
              <div>
                <p className="subtitle" style={{ marginBottom: 0 }}>Saídas</p>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#dc2626" }}>
                  R$ {relatorio.saidas.toFixed(2)}
                </div>
              </div>
            </div>
            <p className="subtitle" style={{ marginBottom: 0, marginTop: 12 }}>Saldo do período</p>
            <div className="total">R$ {relatorio.saldo.toFixed(2)}</div>
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
                <div>R$ {b.total.toFixed(2)}</div>
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
                <div>R$ {c.total.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
