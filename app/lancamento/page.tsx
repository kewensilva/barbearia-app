"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FormaPagamento = "dinheiro" | "pix" | "cartao";
type Servico = { id: string; nome: string; preco: number };

export default function Lancamento() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";

  const [nomeUsuario, setNomeUsuario] = useState("");
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [pagamento, setPagamento] = useState<FormaPagamento | null>(null);
  const [origem, setOrigem] = useState<"agendado" | "encaixe">("agendado");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/servicos")
      .then((r) => r.json())
      .then(setServicos)
      .catch(() => setErro("Não foi possível carregar os serviços"));

    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((usuarios: { id: string; nome: string }[]) => {
        setNomeUsuario(usuarios.find((u) => u.id === usuarioId)?.nome ?? "");
      });
  }, [usuarioId]);

  const podeConfirmar = servicoId && pagamento && !salvando;

  async function confirmar() {
    if (!servicoId || !pagamento) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/atendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, servicoId, formaPagamento: pagamento, origem }),
      });
      if (!res.ok) throw new Error();
      setSalvo(true);
      setTimeout(() => {
        setSalvo(false);
        setServicoId(null);
        setPagamento(null);
      }, 1200);
    } catch {
      setErro("Não foi possível lançar o atendimento, tente de novo");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main>
      <div className="row">
        <div>
          <h1>Novo atendimento</h1>
          <p className="subtitle">{nomeUsuario}</p>
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
        {salvo ? "Lançado ✓" : salvando ? "Lançando..." : "Confirmar atendimento"}
      </button>
    </main>
  );
}
