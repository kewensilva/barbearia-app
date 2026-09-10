"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatarDataBrasil } from "@/lib/data";

type Preset = "hoje" | "semana" | "quinzena" | "mes";

type Atendimento = {
  id: string;
  valor_cobrado: number;
  valor_produto: number | null;
  forma_pagamento: string;
  cliente_nome: string | null;
  criado_em: string;
  services: { nome: string } | null;
  products: { nome: string } | null;
};

type Metricas = {
  quantidade: number;
  quantidadeCortesias: number;
  totalBruto: number;
  totalComissao: number;
  atendimentos: Atendimento[];
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

  if (preset === "quinzena") {
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - 14);
    return { inicio: formatarData(inicio), fim };
  }

  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return { inicio: formatarData(inicio), fim };
}

export default function Metricas() {
  return (
    <Suspense fallback={<main />}>
      <MetricasContent />
    </Suspense>
  );
}

function MetricasContent() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";

  const [preset, setPreset] = useState<Preset>("hoje");
  const [{ inicio, fim }, setPeriodo] = useState(periodoDoPreset("hoje"));
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    fetch(`/api/metricas?usuario=${usuarioId}&inicio=${inicio}&fim=${fim}`)
      .then((r) => r.json())
      .then((dados) => {
        if (dados.erro) throw new Error(dados.erro);
        setMetricas(dados);
      })
      .catch(() => setErro("Não foi possível carregar as métricas"))
      .finally(() => setCarregando(false));
  }, [usuarioId, inicio, fim]);

  return (
    <main>
      <div className="row">
        <h1>Minhas métricas</h1>
        <button
          className="tag"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => router.push(`/lancamento?usuario=${usuarioId}`)}
        >
          voltar
        </button>
      </div>
      <p className="subtitle">Seus atendimentos por período</p>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {(["hoje", "semana", "quinzena", "mes"] as Preset[]).map((p) => (
          <button
            key={p}
            className={`option-btn ${preset === p ? "selected" : ""}`}
            style={{ flex: "1 1 40%" }}
            onClick={() => {
              setPreset(p);
              setPeriodo(periodoDoPreset(p));
            }}
          >
            {{ hoje: "Hoje", semana: "Semanal", quinzena: "Quinzenal", mes: "Mensal" }[p]}
          </button>
        ))}
      </div>

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}
      {carregando && <p className="subtitle">Carregando...</p>}

      {metricas && !carregando && (
        <>
          <div className="card">
            <div className="row">
              <div>
                <p className="subtitle" style={{ marginBottom: 0 }}>Atendimentos</p>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{metricas.quantidade}</div>
              </div>
              <div>
                <p className="subtitle" style={{ marginBottom: 0 }}>Faturado</p>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>
                  R$ {metricas.totalBruto.toFixed(2)}
                </div>
              </div>
            </div>
            <p className="subtitle" style={{ marginBottom: 0, marginTop: 12 }}>
              Comissão estimada do período
            </p>
            <div className="total">R$ {metricas.totalComissao.toFixed(2)}</div>
            {metricas.quantidadeCortesias > 0 && (
              <p className="subtitle" style={{ marginBottom: 0 }}>
                + {metricas.quantidadeCortesias} cortesia(s) (não contam pra comissão)
              </p>
            )}
          </div>

          <p className="section-label">Atendimentos do período</p>
          <div className="card">
            {metricas.atendimentos.length === 0 && (
              <p className="subtitle">Nenhum atendimento nesse período</p>
            )}
            {metricas.atendimentos.map((a) => (
              <div key={a.id} className="tx-item">
                <div>
                  <div>
                    {a.services?.nome}
                    {a.products?.nome ? ` + ${a.products.nome}` : ""}
                    {a.cliente_nome ? ` · ${a.cliente_nome}` : ""}
                  </div>
                  <div className="subtitle" style={{ marginBottom: 0 }}>
                    {new Date(a.criado_em).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {a.forma_pagamento}
                  </div>
                </div>
                <div>R$ {(a.valor_cobrado + (a.valor_produto ?? 0)).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
