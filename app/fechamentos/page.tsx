"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ResumoUsuario = {
  id: string;
  nome: string;
  role: "admin" | "barber";
  quantidade: number;
  totalBruto: number;
  totalComissao: number;
};

type Pendente = {
  id: string;
  barber_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_bruto: number;
  total_comissao: number;
  status: "pendente" | "pago";
  users: { nome: string } | null;
};

export default function Fechamentos() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";
  const [resumo, setResumo] = useState<ResumoUsuario[]>([]);
  const [pendentesPagamento, setPendentesPagamento] = useState<Pendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    fetch("/api/fechamentos")
      .then((r) => r.json())
      .then((dados) => {
        setResumo(dados.resumo ?? []);
        setPendentesPagamento(dados.pendentesPagamento ?? []);
      })
      .catch(() => setErro("Não foi possível carregar os fechamentos"))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function fechar(barberId: string) {
    setProcessando(barberId);
    setErro(null);
    const res = await fetch("/api/fechamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId }),
    });
    if (!res.ok) {
      const dados = await res.json();
      setErro(dados.erro ?? "Erro ao fechar período");
    }
    carregar();
    setProcessando(null);
  }

  async function pagar(closingId: string) {
    setProcessando(closingId);
    setErro(null);
    const res = await fetch(`/api/fechamentos/${closingId}/pagar`, { method: "POST" });
    if (!res.ok) {
      const dados = await res.json();
      setErro(dados.erro ?? "Erro ao marcar como pago");
    }
    carregar();
    setProcessando(null);
  }

  return (
    <main>
      <div className="row">
        <h1>Fechamentos</h1>
        <button
          className="tag"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => router.push(`/caixa?usuario=${usuarioId}`)}
        >
          voltar
        </button>
      </div>
      <p className="subtitle">Confira o pendente e feche o período de cada pessoa</p>

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}
      {carregando && <p className="subtitle">Carregando...</p>}

      <p className="section-label">Pendente de fechar</p>
      {resumo.map((u) => (
        <div key={u.id} className="card">
          <div className="row">
            <div>
              <div style={{ fontWeight: 600 }}>{u.nome}</div>
              <div className="subtitle" style={{ marginBottom: 0 }}>
                {u.quantidade} atendimento(s) em aberto
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div>R$ {u.totalBruto.toFixed(2)}</div>
              {u.role === "barber" && (
                <div className="subtitle" style={{ marginBottom: 0 }}>
                  comissão R$ {u.totalComissao.toFixed(2)}
                </div>
              )}
            </div>
          </div>
          <button
            className="small-btn"
            disabled={u.quantidade === 0 || processando === u.id}
            onClick={() => fechar(u.id)}
          >
            {processando === u.id ? "Fechando..." : "Fechar período"}
          </button>
        </div>
      ))}

      <p className="section-label">Fechamentos pendentes de pagamento</p>
      {!carregando && pendentesPagamento.length === 0 && (
        <p className="subtitle">Nenhum fechamento aguardando pagamento</p>
      )}
      {pendentesPagamento.map((f) => (
        <div key={f.id} className="card">
          <div className="row">
            <div>
              <div style={{ fontWeight: 600 }}>{f.users?.nome}</div>
              <div className="subtitle" style={{ marginBottom: 0 }}>
                {new Date(f.periodo_inicio).toLocaleDateString("pt-BR")} a{" "}
                {new Date(f.periodo_fim).toLocaleDateString("pt-BR")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div>bruto R$ {f.total_bruto.toFixed(2)}</div>
              <div className="subtitle" style={{ marginBottom: 0 }}>
                comissão R$ {f.total_comissao.toFixed(2)}
              </div>
            </div>
          </div>
          <button
            className="small-btn"
            disabled={processando === f.id}
            onClick={() => pagar(f.id)}
          >
            {processando === f.id ? "Marcando..." : "Marcar como pago"}
          </button>
        </div>
      ))}
    </main>
  );
}
