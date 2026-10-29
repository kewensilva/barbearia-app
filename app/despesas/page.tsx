"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hojeBrasil } from "@/lib/data";

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

export default function Despesas() {
  return (
    <Suspense fallback={<main />}>
      <DespesasContent />
    </Suspense>
  );
}

function DespesasContent() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("produtos");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeBrasil());
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
      setData(hojeBrasil());
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
          <DespesaItem key={d.id} despesa={d} onAlterado={carregar} />
        ))}
      </div>
    </main>
  );
}

function DespesaItem({ despesa, onAlterado }: { despesa: Despesa; onAlterado: () => void }) {
  const [editando, setEditando] = useState(false);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [descricao, setDescricao] = useState(despesa.descricao);
  const [categoria, setCategoria] = useState<Categoria>(
    CATEGORIAS.includes(despesa.categoria as Categoria) ? (despesa.categoria as Categoria) : "outros"
  );
  const [valor, setValor] = useState(String(despesa.valor));
  const [data, setData] = useState(despesa.data);
  const [recorrente, setRecorrente] = useState(despesa.recorrente);

  const valorNumero = Number(valor.replace(",", "."));
  const podeSalvar = descricao.trim() !== "" && valor !== "" && valorNumero > 0 && data !== "";

  function cancelarEdicao() {
    setDescricao(despesa.descricao);
    setValor(String(despesa.valor));
    setData(despesa.data);
    setRecorrente(despesa.recorrente);
    setErro(null);
    setEditando(false);
  }

  async function salvar() {
    setProcessando(true);
    setErro(null);
    const res = await fetch(`/api/despesas/${despesa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricao, categoria, valor: valorNumero, data, recorrente }),
    });
    if (!res.ok) {
      const dados = await res.json().catch(() => null);
      setErro(dados?.erro ?? "Não foi possível salvar");
      setProcessando(false);
      return;
    }
    setEditando(false);
    setProcessando(false);
    onAlterado();
  }

  async function excluir() {
    setProcessando(true);
    setErro(null);
    const res = await fetch(`/api/despesas/${despesa.id}`, { method: "DELETE" });
    if (!res.ok) {
      const dados = await res.json().catch(() => null);
      setErro(dados?.erro ?? "Não foi possível excluir");
      setProcessando(false);
      return;
    }
    onAlterado();
  }

  if (editando) {
    return (
      <div className="tx-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
        {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}

        <input
          className="input"
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <p className="section-label" style={{ marginTop: 0 }}>Categoria</p>
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

        <p className="section-label" style={{ marginTop: 0 }}>Valor (R$)</p>
        <input
          className="input"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />

        <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} />

        <button
          className={`option-btn ${recorrente ? "selected" : ""}`}
          style={{ width: "100%" }}
          onClick={() => setRecorrente(!recorrente)}
        >
          {recorrente ? "Recorrente ✓" : "Marcar como recorrente"}
        </button>

        <div className="row" style={{ gap: 8 }}>
          <button className="small-btn" style={{ flex: 1, background: "#a8a29e" }} onClick={cancelarEdicao}>
            Cancelar
          </button>
          <button className="small-btn" style={{ flex: 1 }} disabled={!podeSalvar || processando} onClick={salvar}>
            {processando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
      <div className="row">
        <div>
          <div>{despesa.descricao}</div>
          <div className="subtitle" style={{ marginBottom: 0 }}>
            {new Date(`${despesa.data}T00:00:00`).toLocaleDateString("pt-BR")} · {despesa.categoria}
            {despesa.recorrente ? " · recorrente" : ""}
          </div>
        </div>
        <div>{despesa.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
      </div>

      {erro && <p className="subtitle" style={{ color: "#dc2626", marginBottom: 0 }}>{erro}</p>}

      {confirmandoExcluir ? (
        <div className="row" style={{ gap: 8 }}>
          <p className="subtitle" style={{ marginBottom: 0, flex: 1 }}>Excluir essa despesa?</p>
          <button
            className="small-btn"
            style={{ width: "auto", marginTop: 0, background: "#a8a29e" }}
            onClick={() => setConfirmandoExcluir(false)}
          >
            Cancelar
          </button>
          <button
            className="small-btn"
            style={{ width: "auto", marginTop: 0, background: "#dc2626" }}
            disabled={processando}
            onClick={excluir}
          >
            {processando ? "Excluindo..." : "Confirmar"}
          </button>
        </div>
      ) : (
        <div className="row" style={{ gap: 8 }}>
          <button className="small-btn" style={{ width: "auto", marginTop: 0 }} onClick={() => setEditando(true)}>
            Editar
          </button>
          <button
            className="small-btn"
            style={{ width: "auto", marginTop: 0, background: "#dc2626" }}
            onClick={() => setConfirmandoExcluir(true)}
          >
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}
