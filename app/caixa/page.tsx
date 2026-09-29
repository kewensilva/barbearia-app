"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AtendimentoItem, type Atendimento, type Servico, type Produto } from "@/app/components/AtendimentoItem";

export default function Caixa() {
  return (
    <Suspense fallback={<main />}>
      <CaixaContent />
    </Suspense>
  );
}

function CaixaContent() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pinAreasSensiveis, setPinAreasSensiveis] = useState(true);

  function carregarAtendimentos() {
    fetch("/api/atendimentos")
      .then((r) => r.json())
      .then(setAtendimentos)
      .catch(() => setErro("Não foi possível carregar o caixa"))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarAtendimentos();

    fetch("/api/servicos")
      .then((r) => r.json())
      .then(setServicos)
      .catch(() => {});

    fetch("/api/produtos")
      .then((r) => r.json())
      .then(setProdutos)
      .catch(() => {});

    fetch("/api/organizacao")
      .then((r) => r.json())
      .then((dados) => setPinAreasSensiveis(dados.pinAreasSensiveis ?? true))
      .catch(() => {});
  }, []);

  const total = atendimentos.reduce(
    (soma, a) => soma + a.valor_cobrado + (a.valor_produto ?? 0),
    0
  );

  function irPara(destino: string) {
    router.push(
      pinAreasSensiveis
        ? `/confirmar-pin?usuario=${usuarioId}&destino=${destino}`
        : `${destino}?usuario=${usuarioId}`
    );
  }

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
          onClick={() => {
            fetch("/api/dispositivo", { method: "DELETE" }).finally(() => router.push("/"));
          }}
        >
          trocar usuário
        </button>
      </div>

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}

      <div className="card">
        <p className="subtitle" style={{ marginBottom: 0 }}>Total do dia</p>
        <div className="total"> {total.toLocaleString('pt-BR', {style:"currency", currency:"BRL"})}</div>
      </div>

      <div className="card">
        {carregando && <p className="subtitle">Carregando...</p>}
        {!carregando && atendimentos.length === 0 && (
          <p className="subtitle">Nenhum atendimento hoje ainda</p>
        )}
        {atendimentos.map((a) => (
          <AtendimentoItem
            key={a.id}
            atendimento={a}
            servicos={servicos}
            produtos={produtos}
            onAlterado={carregarAtendimentos}
          />
        ))}
      </div>

      <button
        className="primary-btn"
        onClick={() => router.push(`/lancamento?usuario=${usuarioId}`)}
      >
        Novo atendimento
      </button>
      <button className="primary-btn" onClick={() => irPara("/fechamentos")}>
        Fechar caixa
      </button>
      <button
        className="primary-btn"
        style={{ background: "#78716c" }}
        onClick={() => irPara("/despesas")}
      >
        Lançar despesa
      </button>
      <button
        className="primary-btn"
        style={{ background: "#57534e" }}
        onClick={() => irPara("/relatorio")}
      >
        Relatório
      </button>
      <button
        className="primary-btn"
        style={{ background: "#a8a29e" }}
        onClick={() => irPara("/configuracoes")}
      >
        Configurações
      </button>
      <button
        className="primary-btn"
        style={{ background: "#a8a29e" }}
        onClick={() => irPara("/usuarios")}
      >
        Usuários
      </button>
      <button
        className="primary-btn"
        style={{ background: "#a8a29e" }}
        onClick={() => irPara("/servicos")}
      >
        Serviços
      </button>
      <button
        className="primary-btn"
        style={{ background: "#a8a29e" }}
        onClick={() => irPara("/produtos")}
      >
        Produtos
      </button>
    </main>
  );
}
