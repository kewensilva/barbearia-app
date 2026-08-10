"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Atendimento = {
  id: string;
  valor_cobrado: number;
  forma_pagamento: "dinheiro" | "pix" | "cartao";
  criado_em: string;
  users: { nome: string } | null;
  services: { nome: string } | null;
};

export default function Caixa() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/atendimentos")
      .then((r) => r.json())
      .then(setAtendimentos)
      .catch(() => setErro("Não foi possível carregar o caixa"))
      .finally(() => setCarregando(false));
  }, []);

  const total = atendimentos.reduce((soma, a) => soma + a.valor_cobrado, 0);

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
          onClick={() => router.push("/")}
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
          <div key={a.id} className="tx-item">
            <div>
              <div>{a.services?.nome}</div>
              <div className="subtitle" style={{ marginBottom: 0 }}>
                {a.users?.nome} ·{" "}
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

      <button className="primary-btn" disabled>
        Fechar caixa (em breve)
      </button>
      <button className="primary-btn" style={{ background: "#78716c" }} disabled>
        Lançar despesa (em breve)
      </button>
      <button
        className="primary-btn"
        style={{ background: "#57534e" }}
        onClick={() =>
          router.push(`/confirmar-pin?usuario=${usuarioId}&destino=/configuracoes`)
        }
      >
        Configurações
      </button>
    </main>
  );
}
