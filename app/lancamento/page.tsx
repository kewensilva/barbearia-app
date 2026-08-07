"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { servicos, usuarios } from "@/lib/mockData";

type FormaPagamento = "dinheiro" | "pix" | "cartao";

// TODO (backend real): trocar o alert() final por um insert na tabela
// `transactions` via Supabase (org_id, barber_id, service_id, valor_cobrado,
// forma_pagamento, origem). Ver schema.sql.
export default function Lancamento() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario");
  const usuario = usuarios.find((u) => u.id === usuarioId) ?? usuarios[1];

  const [servicoId, setServicoId] = useState<string | null>(null);
  const [pagamento, setPagamento] = useState<FormaPagamento | null>(null);
  const [origem, setOrigem] = useState<"agendado" | "encaixe">("agendado");
  const [salvo, setSalvo] = useState(false);

  const servico = servicos.find((s) => s.id === servicoId);
  const podeConfirmar = servico && pagamento;

  function confirmar() {
    setSalvo(true);
    setTimeout(() => {
      setSalvo(false);
      setServicoId(null);
      setPagamento(null);
    }, 1200);
  }

  return (
    <main>
      <div className="row">
        <div>
          <h1>Novo atendimento</h1>
          <p className="subtitle">{usuario.nome}</p>
        </div>
        <button
          className="tag"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => router.push("/")}
        >
          trocar usuário
        </button>
      </div>

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

      <button
        className="primary-btn"
        disabled={!podeConfirmar}
        onClick={confirmar}
      >
        {salvo ? "Lançado ✓" : "Confirmar atendimento"}
      </button>
    </main>
  );
}
