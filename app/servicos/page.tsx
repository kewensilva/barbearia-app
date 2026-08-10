"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Servico = { id: string; nome: string; preco: number; ativo: boolean };

export default function Servicos() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  const [nomeNovo, setNomeNovo] = useState("");
  const [precoNovo, setPrecoNovo] = useState("");

  function carregar() {
    setCarregando(true);
    fetch("/api/servicos?todos=1")
      .then((r) => r.json())
      .then(setServicos)
      .catch(() => setErro("Não foi possível carregar os serviços"))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function salvarServico(id: string, nome: string, preco: number) {
    setProcessando(id);
    await fetch(`/api/servicos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, preco }),
    });
    carregar();
    setProcessando(null);
  }

  async function alternarAtivo(id: string, ativo: boolean) {
    setProcessando(id);
    await fetch(`/api/servicos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo }),
    });
    carregar();
    setProcessando(null);
  }

  const precoNovoNumero = Number(precoNovo.replace(",", "."));
  const podeCadastrar = nomeNovo.trim() !== "" && precoNovo !== "" && precoNovoNumero > 0;

  async function cadastrarServico() {
    setProcessando("novo");
    setErro(null);
    const res = await fetch("/api/servicos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeNovo, preco: precoNovoNumero }),
    });
    if (!res.ok) {
      const dados = await res.json();
      setErro(dados.erro ?? "Erro ao cadastrar serviço");
    } else {
      setNomeNovo("");
      setPrecoNovo("");
    }
    carregar();
    setProcessando(null);
  }

  return (
    <main>
      <div className="row">
        <h1>Serviços</h1>
        <button
          className="tag"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => router.push(`/caixa?usuario=${usuarioId}`)}
        >
          voltar
        </button>
      </div>
      <p className="subtitle">Preços, novos serviços e reajustes</p>

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}
      {carregando && <p className="subtitle">Carregando...</p>}

      {servicos.map((s) => (
        <ServicoCard
          key={s.id}
          servico={s}
          processando={processando === s.id}
          onSalvar={salvarServico}
          onAlternarAtivo={alternarAtivo}
        />
      ))}

      <p className="section-label">Novo serviço</p>
      <div className="card">
        <input
          className="input"
          placeholder="Nome (ex: Alisamento)"
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
        <button
          className="small-btn"
          disabled={!podeCadastrar || processando === "novo"}
          onClick={cadastrarServico}
        >
          {processando === "novo" ? "Cadastrando..." : "Cadastrar serviço"}
        </button>
      </div>
    </main>
  );
}

function ServicoCard({
  servico,
  processando,
  onSalvar,
  onAlternarAtivo,
}: {
  servico: Servico;
  processando: boolean;
  onSalvar: (id: string, nome: string, preco: number) => void;
  onAlternarAtivo: (id: string, ativo: boolean) => void;
}) {
  const [nome, setNome] = useState(servico.nome);
  const [preco, setPreco] = useState(String(servico.preco));

  const precoNumero = Number(preco.replace(",", "."));
  const alterado =
    (nome.trim() !== "" && nome !== servico.nome) ||
    (preco !== "" && precoNumero > 0 && precoNumero !== servico.preco);

  return (
    <div className="card" style={{ opacity: servico.ativo ? 1 : 0.6 }}>
      {!servico.ativo && <p className="section-label" style={{ marginTop: 0 }}>inativo</p>}
      <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
      <input
        className="input"
        inputMode="decimal"
        value={preco}
        onChange={(e) => setPreco(e.target.value)}
      />
      <div className="row" style={{ gap: 8 }}>
        <button
          className="small-btn"
          style={{ flex: 1 }}
          disabled={!alterado || processando}
          onClick={() => onSalvar(servico.id, nome, precoNumero)}
        >
          Salvar
        </button>
        <button
          className="small-btn"
          style={{ flex: 1, background: servico.ativo ? "#dc2626" : "#57534e" }}
          disabled={processando}
          onClick={() => onAlternarAtivo(servico.id, !servico.ativo)}
        >
          {servico.ativo ? "Desativar" : "Reativar"}
        </button>
      </div>
    </div>
  );
}
