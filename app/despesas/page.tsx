"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Categoria = "aluguel" | "energia" | "internet" | "produtos" | "outros";
type Despesa = {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  recorrente: boolean;
  closing_id: string | null;
};

const CATEGORIAS: Categoria[] = ["aluguel", "energia", "internet", "produtos", "outros"];

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function Despesas() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("produtos");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [recorrente, setRecorrente] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    setCarregando(true);
    fetch("/api/despesas")
      .then((r) => r.json())
      .then(setDespesas)
      .catch(() => setErro("Não foi possível carregar as despesas"))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  const valorNumero = Number(valor.replace(",", "."));
  const podeSalvar = descricao.trim() !== "" && valor !== "" && valorNumero > 0 && !salvando;

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const res = await fetch("/api/despesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricao, categoria, valor: valorNumero, data, recorrente }),
    });
    if (!res.ok) {
      const dados = await res.json();
      setErro(dados.erro ?? "Erro ao lançar despesa");
    } else {
      setDescricao("");
      setValor("");
      setRecorrente(false);
      setData(hoje());
    }
    carregar();
    setSalvando(false);
  }

  const despesasManuais = despesas.filter((d) => !d.closing_id);

  return (
    <main>
      <div className="row">
        <h1>Despesas</h1>
        <button
          className="tag"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => router.push(`/caixa?usuario=${usuarioId}`)}
        >
          voltar
        </button>
      </div>
      <p className="subtitle">Cadastro de despesas da barbearia</p>

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}

      <div className="card">
        <input
          className="input"
          placeholder="Descrição (ex: Conta de energia)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <p className="section-label">Categoria</p>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              className={`option-btn ${categoria === c ? "selected" : ""}`}
              style={{ flex: "1 1 28%" }}
              onClick={() => setCategoria(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <input
          className="input"
          inputMode="decimal"
          placeholder="Valor (R$)"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />

        <input
          className="input"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />

        <button
          className={`option-btn ${recorrente ? "selected" : ""}`}
          style={{ width: "100%", marginBottom: 12 }}
          onClick={() => setRecorrente(!recorrente)}
        >
          {recorrente ? "Recorrente ✓" : "Marcar como recorrente"}
        </button>

        <button className="small-btn" disabled={!podeSalvar} onClick={salvar}>
          {salvando ? "Lançando..." : "Lançar despesa"}
        </button>
      </div>

      <p className="section-label">Despesas lançadas</p>
      {carregando && <p className="subtitle">Carregando...</p>}
      {!carregando && despesasManuais.length === 0 && (
        <p className="subtitle">Nenhuma despesa manual ainda</p>
      )}
      <div className="card">
        {despesasManuais.map((d) => (
          <div key={d.id} className="tx-item">
            <div>
              <div>{d.descricao}</div>
              <div className="subtitle" style={{ marginBottom: 0 }}>
                {new Date(`${d.data}T00:00:00`).toLocaleDateString("pt-BR")} · {d.categoria}
                {d.recorrente ? " · recorrente" : ""}
              </div>
            </div>
            <div>R$ {d.valor.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
