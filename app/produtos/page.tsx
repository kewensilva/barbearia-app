"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  comissao_percentual: number | null;
  ativo: boolean;
};

export default function Produtos() {
  return (
    <Suspense fallback={<main />}>
      <ProdutosContent />
    </Suspense>
  );
}

function ProdutosContent() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  const [nomeNovo, setNomeNovo] = useState("");
  const [precoNovo, setPrecoNovo] = useState("");
  const [comissaoNova, setComissaoNova] = useState("");

  function carregar() {
    setCarregando(true);
    fetch("/api/produtos?todos=1")
      .then((r) => r.json())
      .then(setProdutos)
      .catch(() => setErro("Não foi possível carregar os produtos"))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function salvarProduto(
    id: string,
    nome: string,
    preco: number,
    comissaoPercentual: number | null
  ) {
    setProcessando(id);
    await fetch(`/api/produtos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, preco, comissaoPercentual }),
    });
    carregar();
    setProcessando(null);
  }

  async function alternarAtivo(id: string, ativo: boolean) {
    setProcessando(id);
    await fetch(`/api/produtos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo }),
    });
    carregar();
    setProcessando(null);
  }

  const precoNovoNumero = Number(precoNovo.replace(",", "."));
  const comissaoNovaNumero = comissaoNova.trim() === "" ? null : Number(comissaoNova.replace(",", "."));
  const podeCadastrar = nomeNovo.trim() !== "" && precoNovo !== "" && precoNovoNumero > 0;

  async function cadastrarProduto() {
    setProcessando("novo");
    setErro(null);
    const res = await fetch("/api/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nomeNovo,
        preco: precoNovoNumero,
        comissaoPercentual: comissaoNovaNumero,
      }),
    });
    if (!res.ok) {
      const dados = await res.json();
      setErro(dados.erro ?? "Erro ao cadastrar produto");
    } else {
      setNomeNovo("");
      setPrecoNovo("");
      setComissaoNova("");
    }
    carregar();
    setProcessando(null);
  }

  return (
    <main>
      <div className="row">
        <h1>Produtos</h1>
        <button
          className="tag"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => router.push(`/caixa?usuario=${usuarioId}`)}
        >
          voltar
        </button>
      </div>
      <p className="subtitle">Produtos vendidos junto com o atendimento (sem controle de estoque)</p>

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}
      {carregando && <p className="subtitle">Carregando...</p>}

      {produtos.map((p) => (
        <ProdutoCard
          key={p.id}
          produto={p}
          processando={processando === p.id}
          onSalvar={salvarProduto}
          onAlternarAtivo={alternarAtivo}
        />
      ))}

      <p className="section-label">Novo produto</p>
      <div className="card">
        <input
          className="input"
          placeholder="Nome (ex: Pomada modeladora)"
          value={nomeNovo}
          onChange={(e) => setNomeNovo(e.target.value)}
        />
        <input
          className="input"
          inputMode="decimal"
          placeholder="Preço (R$)"
          value={precoNovo}
          onChange={(e) => setPrecoNovo(e.target.value)}
        />
        <input
          className="input"
          inputMode="decimal"
          placeholder="Comissão do barbeiro (%, opcional)"
          value={comissaoNova}
          onChange={(e) => setComissaoNova(e.target.value)}
        />
        <button
          className="small-btn"
          disabled={!podeCadastrar || processando === "novo"}
          onClick={cadastrarProduto}
        >
          {processando === "novo" ? "Cadastrando..." : "Cadastrar produto"}
        </button>
      </div>
    </main>
  );
}

function ProdutoCard({
  produto,
  processando,
  onSalvar,
  onAlternarAtivo,
}: {
  produto: Produto;
  processando: boolean;
  onSalvar: (id: string, nome: string, preco: number, comissaoPercentual: number | null) => void;
  onAlternarAtivo: (id: string, ativo: boolean) => void;
}) {
  const [nome, setNome] = useState(produto.nome);
  const [preco, setPreco] = useState(String(produto.preco));
  const [comissao, setComissao] = useState(
    produto.comissao_percentual != null ? String(produto.comissao_percentual) : ""
  );

  const precoNumero = Number(preco.replace(",", "."));
  const comissaoNumero = comissao.trim() === "" ? null : Number(comissao.replace(",", "."));
  const alterado =
    (nome.trim() !== "" && nome !== produto.nome) ||
    (preco !== "" && precoNumero > 0 && precoNumero !== produto.preco) ||
    comissaoNumero !== produto.comissao_percentual;

  return (
    <div className="card" style={{ opacity: produto.ativo ? 1 : 0.6 }}>
      {!produto.ativo && <p className="section-label" style={{ marginTop: 0 }}>inativo</p>}
      <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
      <input
        className="input"
        inputMode="decimal"
        value={preco}
        onChange={(e) => setPreco(e.target.value)}
      />
      <input
        className="input"
        inputMode="decimal"
        placeholder="Comissão do barbeiro (%, opcional)"
        value={comissao}
        onChange={(e) => setComissao(e.target.value)}
      />
      <div className="row" style={{ gap: 8 }}>
        <button
          className="small-btn"
          style={{ flex: 1 }}
          disabled={!alterado || processando}
          onClick={() => onSalvar(produto.id, nome, precoNumero, comissaoNumero)}
        >
          Salvar
        </button>
        <button
          className="small-btn"
          style={{ flex: 1, background: produto.ativo ? "#dc2626" : "#57534e" }}
          disabled={processando}
          onClick={() => onAlternarAtivo(produto.id, !produto.ativo)}
        >
          {produto.ativo ? "Desativar" : "Reativar"}
        </button>
      </div>
    </div>
  );
}
