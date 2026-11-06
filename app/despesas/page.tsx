"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hojeBrasil } from "@/lib/data";
import { CATEGORIAS_MANUAIS, type CategoriaManual } from "@/lib/despesa";

type Usuario = { id: string; nome: string; role: "admin" | "barber" };
type Despesa = {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  recorrente: boolean;
  closing_id: string | null;
  barber_id: string | null;
  users: { nome: string } | null;
};

// "todas" só existe no filtro; null = barbearia; string = id do barbeiro.
type Filtro = "todas" | string | null;

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
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<CategoriaManual>("produtos");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeBrasil());
  const [recorrente, setRecorrente] = useState(false);
  const [donoId, setDonoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const usuarioAtual = usuarios?.find((u) => u.id === usuarioId);
  const ehBarbeiro = usuarioAtual?.role === "barber";
  const barbeiros = (usuarios ?? []).filter((u) => u.role === "barber");

  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then(setUsuarios)
      .catch(() => setUsuarios([]));
  }, []);

  function carregar() {
    if (!usuarios) return;
    setCarregando(true);
    // Barbeiro só enxerga as próprias despesas, nunca as gerais da barbearia.
    fetch(ehBarbeiro ? `/api/despesas?barbeiro=${usuarioId}` : "/api/despesas")
      .then((r) => r.json())
      .then(setDespesas)
      .catch(() => setErro("Não foi possível carregar as despesas"))
      .finally(() => setCarregando(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(carregar, [usuarios]);

  const valorNumero = Number(valor.replace(",", "."));
  const podeSalvar = descricao.trim() !== "" && valor !== "" && valorNumero > 0 && !salvando;

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const res = await fetch("/api/despesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao,
        categoria,
        valor: valorNumero,
        data,
        recorrente,
        barberId: ehBarbeiro ? usuarioId : donoId,
      }),
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

  const despesasManuais = despesas
    .filter((d) => !d.closing_id)
    .filter((d) => filtro === "todas" || d.barber_id === filtro);
  const totalListado = despesasManuais.reduce((soma, d) => soma + d.valor, 0);

  if (!usuarios) {
    return <main />;
  }

  return (
    <main>
      <div className="row">
        <h1>{ehBarbeiro ? "Minhas despesas" : "Despesas"}</h1>
        <button
          className="tag"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() =>
            router.push(`${ehBarbeiro ? "/lancamento" : "/caixa"}?usuario=${usuarioId}`)
          }
        >
          voltar
        </button>
      </div>
      <p className="subtitle">
        {ehBarbeiro
          ? "Compras que você fez pra trabalhar (máquina, shampoo, produtos...)"
          : "Despesas da barbearia e de cada barbeiro"}
      </p>

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}

      <div className="card">
        {!ehBarbeiro && barbeiros.length > 0 && (
          <>
            <p className="section-label" style={{ marginTop: 0 }}>De quem é a despesa</p>
            <EscolhaDono barbeiros={barbeiros} valor={donoId} onEscolher={setDonoId} />
          </>
        )}

        <input
          className="input"
          placeholder={ehBarbeiro ? "Descrição (ex: Máquina de corte)" : "Descrição (ex: Conta de energia)"}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <p className="section-label">Categoria</p>
        <EscolhaCategoria valor={categoria} onEscolher={setCategoria} />

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

      {!ehBarbeiro && barbeiros.length > 0 && (
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {[{ id: "todas", nome: "Todas" }, { id: null, nome: "Barbearia" }, ...barbeiros].map((o) => (
            <button
              key={o.id ?? "barbearia"}
              className={`option-btn ${filtro === o.id ? "selected" : ""}`}
              style={{ flex: "1 1 28%" }}
              onClick={() => setFiltro(o.id)}
            >
              {o.nome}
            </button>
          ))}
        </div>
      )}

      {carregando && <p className="subtitle">Carregando...</p>}
      {!carregando && despesasManuais.length === 0 && (
        <p className="subtitle">Nenhuma despesa lançada ainda</p>
      )}
      {despesasManuais.length > 0 && (
        <div className="card">
          <div className="row">
            <p className="subtitle" style={{ marginBottom: 0 }}>Total listado</p>
            <div style={{ fontWeight: 700 }}>
              {totalListado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </div>
        </div>
      )}
      <div className="card">
        {despesasManuais.map((d) => (
          <DespesaItem
            key={d.id}
            despesa={d}
            barbeiros={ehBarbeiro ? null : barbeiros}
            onAlterado={carregar}
          />
        ))}
      </div>
    </main>
  );
}

function EscolhaDono({
  barbeiros,
  valor,
  onEscolher,
}: {
  barbeiros: Usuario[];
  valor: string | null;
  onEscolher: (id: string | null) => void;
}) {
  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      {[{ id: null, nome: "Barbearia" }, ...barbeiros].map((o) => (
        <button
          key={o.id ?? "barbearia"}
          className={`option-btn ${valor === o.id ? "selected" : ""}`}
          style={{ flex: "1 1 40%" }}
          onClick={() => onEscolher(o.id)}
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}

function EscolhaCategoria({
  valor,
  onEscolher,
}: {
  valor: CategoriaManual;
  onEscolher: (c: CategoriaManual) => void;
}) {
  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      {CATEGORIAS_MANUAIS.map((c) => (
        <button
          key={c}
          className={`option-btn ${valor === c ? "selected" : ""}`}
          style={{ flex: "1 1 28%" }}
          onClick={() => onEscolher(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function DespesaItem({
  despesa,
  barbeiros,
  onAlterado,
}: {
  despesa: Despesa;
  // null quando quem está vendo é o próprio barbeiro (não troca o dono)
  barbeiros: Usuario[] | null;
  onAlterado: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const categoriaInicial = (CATEGORIAS_MANUAIS as readonly string[]).includes(despesa.categoria)
    ? (despesa.categoria as CategoriaManual)
    : "outros";

  const [descricao, setDescricao] = useState(despesa.descricao);
  const [categoria, setCategoria] = useState<CategoriaManual>(categoriaInicial);
  const [valor, setValor] = useState(String(despesa.valor));
  const [data, setData] = useState(despesa.data);
  const [recorrente, setRecorrente] = useState(despesa.recorrente);
  const [donoId, setDonoId] = useState<string | null>(despesa.barber_id);

  const valorNumero = Number(valor.replace(",", "."));
  const podeSalvar = descricao.trim() !== "" && valor !== "" && valorNumero > 0 && data !== "";

  function cancelarEdicao() {
    setDescricao(despesa.descricao);
    setCategoria(categoriaInicial);
    setValor(String(despesa.valor));
    setData(despesa.data);
    setRecorrente(despesa.recorrente);
    setDonoId(despesa.barber_id);
    setErro(null);
    setEditando(false);
  }

  async function salvar() {
    setProcessando(true);
    setErro(null);
    const res = await fetch(`/api/despesas/${despesa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao,
        categoria,
        valor: valorNumero,
        data,
        recorrente,
        barberId: barbeiros ? donoId : undefined,
      }),
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

        {barbeiros && barbeiros.length > 0 && (
          <>
            <p className="section-label" style={{ marginTop: 0 }}>De quem é a despesa</p>
            <EscolhaDono barbeiros={barbeiros} valor={donoId} onEscolher={setDonoId} />
          </>
        )}

        <input
          className="input"
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <p className="section-label" style={{ marginTop: 0 }}>Categoria</p>
        <EscolhaCategoria valor={categoria} onEscolher={setCategoria} />

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
            {barbeiros ? ` · ${despesa.users?.nome ?? "Barbearia"}` : ""}
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
