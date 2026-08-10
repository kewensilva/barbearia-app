"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Periodicidade = "diario" | "semanal" | "quinzenal" | "mensal";
type TipoComissao = "percentual" | "fixo";

type BarbeiroConfig = {
  id: string;
  nome: string;
  comissao: { tipo: TipoComissao; valor: number } | null;
  periodicidade: { periodicidade: Periodicidade; dia_referencia: number | null } | null;
};

const PERIODICIDADES: Periodicidade[] = ["diario", "semanal", "quinzenal", "mensal"];

export default function Configuracoes() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";
  const [barbeiros, setBarbeiros] = useState<BarbeiroConfig[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    fetch("/api/barbeiros-config")
      .then((r) => r.json())
      .then(setBarbeiros)
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function salvarComissao(barberId: string, tipo: TipoComissao, valor: number) {
    setSalvandoId(barberId);
    await fetch("/api/comissao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId, tipo, valor }),
    });
    carregar();
    setSalvandoId(null);
  }

  async function salvarPeriodicidade(
    barberId: string,
    periodicidade: Periodicidade,
    diaReferencia: number | null
  ) {
    setSalvandoId(barberId);
    await fetch("/api/periodicidade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId, periodicidade, diaReferencia }),
    });
    carregar();
    setSalvandoId(null);
  }

  return (
    <main>
      <div className="row">
        <h1>Configurações</h1>
        <button
          className="tag"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => router.push(`/caixa?usuario=${usuarioId}`)}
        >
          voltar
        </button>
      </div>
      <p className="subtitle">Comissão e periodicidade de fechamento por barbeiro</p>

      {carregando && <p className="subtitle">Carregando...</p>}
      {!carregando && barbeiros.length === 0 && (
        <p className="subtitle">Nenhum barbeiro contratado cadastrado ainda</p>
      )}

      {barbeiros.map((b) => (
        <BarbeiroCard
          key={b.id}
          barbeiro={b}
          salvando={salvandoId === b.id}
          onSalvarComissao={salvarComissao}
          onSalvarPeriodicidade={salvarPeriodicidade}
        />
      ))}
    </main>
  );
}

function BarbeiroCard({
  barbeiro,
  salvando,
  onSalvarComissao,
  onSalvarPeriodicidade,
}: {
  barbeiro: BarbeiroConfig;
  salvando: boolean;
  onSalvarComissao: (barberId: string, tipo: TipoComissao, valor: number) => void;
  onSalvarPeriodicidade: (
    barberId: string,
    periodicidade: Periodicidade,
    diaReferencia: number | null
  ) => void;
}) {
  const [tipo, setTipo] = useState<TipoComissao>(barbeiro.comissao?.tipo ?? "percentual");
  const [valor, setValor] = useState(String(barbeiro.comissao?.valor ?? ""));
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>(
    barbeiro.periodicidade?.periodicidade ?? "semanal"
  );
  const [diaReferencia, setDiaReferencia] = useState(
    barbeiro.periodicidade?.dia_referencia != null ? String(barbeiro.periodicidade.dia_referencia) : ""
  );

  const valorNumero = Number(valor.replace(",", "."));
  const podeSalvarComissao = valor !== "" && valorNumero > 0;

  return (
    <div className="card">
      <h1 style={{ fontSize: 17 }}>{barbeiro.nome}</h1>

      <p className="section-label">Comissão</p>
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <button
          className={`option-btn ${tipo === "percentual" ? "selected" : ""}`}
          onClick={() => setTipo("percentual")}
        >
          Percentual
        </button>
        <button className={`option-btn ${tipo === "fixo" ? "selected" : ""}`} onClick={() => setTipo("fixo")}>
          Valor fixo
        </button>
      </div>
      <input
        className="input"
        inputMode="decimal"
        placeholder={tipo === "percentual" ? "Ex: 50 (%)" : "Ex: 20 (R$ por corte)"}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
      />
      <button
        className="small-btn"
        disabled={!podeSalvarComissao || salvando}
        onClick={() => onSalvarComissao(barbeiro.id, tipo, valorNumero)}
      >
        Salvar comissão
      </button>

      <p className="section-label">Periodicidade de fechamento</p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {PERIODICIDADES.map((p) => (
          <button
            key={p}
            className={`option-btn ${periodicidade === p ? "selected" : ""}`}
            style={{ flex: "1 1 40%" }}
            onClick={() => setPeriodicidade(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <input
        className="input"
        style={{ marginTop: 12 }}
        inputMode="numeric"
        placeholder="Dia de referência (opcional)"
        value={diaReferencia}
        onChange={(e) => setDiaReferencia(e.target.value)}
      />
      <button
        className="small-btn"
        disabled={salvando}
        onClick={() =>
          onSalvarPeriodicidade(
            barbeiro.id,
            periodicidade,
            diaReferencia === "" ? null : Number(diaReferencia)
          )
        }
      >
        Salvar periodicidade
      </button>
    </div>
  );
}
