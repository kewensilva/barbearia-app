"use client";

import { useRouter } from "next/navigation";
import { atendimentosDoDia } from "@/lib/mockData";

// TODO (backend real): substituir `atendimentosDoDia` por uma query real
// filtrando transactions por org_id + data, e somar expenses do mesmo
// período para chegar no saldo líquido (ver seção 5 do plano-mvp.md).
export default function Caixa() {
  const router = useRouter();
  const total = atendimentosDoDia.reduce((soma, a) => soma + a.valor, 0);

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

      <div className="card">
        <p className="subtitle" style={{ marginBottom: 0 }}>Total do dia</p>
        <div className="total">R$ {total.toFixed(2)}</div>
      </div>

      <div className="card">
        {atendimentosDoDia.map((a) => (
          <div key={a.id} className="tx-item">
            <div>
              <div>{a.servicoNome}</div>
              <div className="subtitle" style={{ marginBottom: 0 }}>
                {a.barbeiroNome} · {a.horario} · {a.formaPagamento}
              </div>
            </div>
            <div>R$ {a.valor.toFixed(2)}</div>
          </div>
        ))}
      </div>

      <button className="primary-btn" disabled>
        Fechar caixa (em breve)
      </button>
      <button className="primary-btn" style={{ background: "#78716c" }} disabled>
        Lançar despesa (em breve)
      </button>
    </main>
  );
}
