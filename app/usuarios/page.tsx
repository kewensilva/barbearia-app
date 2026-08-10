"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Usuario = { id: string; nome: string; role: "admin" | "barber"; ativo: boolean };

export default function Usuarios() {
  return (
    <Suspense fallback={<main />}>
      <UsuariosContent />
    </Suspense>
  );
}

function UsuariosContent() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  const [nomeNovo, setNomeNovo] = useState("");
  const [pinNovo, setPinNovo] = useState("");

  function carregar() {
    setCarregando(true);
    fetch("/api/usuarios?todos=1")
      .then((r) => r.json())
      .then(setUsuarios)
      .catch(() => setErro("Não foi possível carregar os usuários"))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function salvarNome(id: string, nome: string) {
    setProcessando(id);
    await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    carregar();
    setProcessando(null);
  }

  async function desativar(id: string) {
    setProcessando(id);
    await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: false }),
    });
    carregar();
    setProcessando(null);
  }

  async function reativar(id: string) {
    setProcessando(id);
    await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: true }),
    });
    carregar();
    setProcessando(null);
  }

  const podeCadastrar = nomeNovo.trim() !== "" && /^\d{4}$/.test(pinNovo);

  async function cadastrarBarbeiro() {
    setProcessando("novo");
    setErro(null);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeNovo, role: "barber", pin: pinNovo }),
    });
    if (!res.ok) {
      const dados = await res.json();
      setErro(dados.erro ?? "Erro ao cadastrar barbeiro");
    } else {
      setNomeNovo("");
      setPinNovo("");
    }
    carregar();
    setProcessando(null);
  }

  return (
    <main>
      <div className="row">
        <h1>Usuários</h1>
        <button
          className="tag"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => router.push(`/caixa?usuario=${usuarioId}`)}
        >
          voltar
        </button>
      </div>
      <p className="subtitle">Edite nomes, desative ou cadastre um novo contratado</p>

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}
      {carregando && <p className="subtitle">Carregando...</p>}

      {usuarios.map((u) => (
        <UsuarioCard
          key={u.id}
          usuario={u}
          processando={processando === u.id}
          onSalvarNome={salvarNome}
          onDesativar={desativar}
          onReativar={reativar}
        />
      ))}

      <p className="section-label">Cadastrar novo contratado</p>
      <div className="card">
        <input
          className="input"
          placeholder="Nome do novo barbeiro"
          value={nomeNovo}
          onChange={(e) => setNomeNovo(e.target.value)}
        />
        <input
          className="input"
          inputMode="numeric"
          maxLength={4}
          placeholder="PIN de 4 dígitos"
          value={pinNovo}
          onChange={(e) => setPinNovo(e.target.value.replace(/\D/g, "").slice(0, 4))}
        />
        <button
          className="small-btn"
          disabled={!podeCadastrar || processando === "novo"}
          onClick={cadastrarBarbeiro}
        >
          {processando === "novo" ? "Cadastrando..." : "Cadastrar barbeiro"}
        </button>
      </div>
    </main>
  );
}

function UsuarioCard({
  usuario,
  processando,
  onSalvarNome,
  onDesativar,
  onReativar,
}: {
  usuario: Usuario;
  processando: boolean;
  onSalvarNome: (id: string, nome: string) => void;
  onDesativar: (id: string) => void;
  onReativar: (id: string) => void;
}) {
  const [nome, setNome] = useState(usuario.nome);
  const [confirmandoDesativar, setConfirmandoDesativar] = useState(false);
  const alterado = nome.trim() !== "" && nome !== usuario.nome;

  return (
    <div className="card" style={{ opacity: usuario.ativo ? 1 : 0.6 }}>
      <p className="section-label" style={{ marginTop: 0 }}>
        {usuario.role === "admin" ? "Dono" : "Contratado"}
        {!usuario.ativo ? " · inativo" : ""}
      </p>
      <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
      <div className="row" style={{ gap: 8 }}>
        <button
          className="small-btn"
          style={{ flex: 1 }}
          disabled={!alterado || processando}
          onClick={() => onSalvarNome(usuario.id, nome)}
        >
          Salvar nome
        </button>
        {usuario.role === "barber" && usuario.ativo && !confirmandoDesativar && (
          <button
            className="small-btn"
            style={{ flex: 1, background: "#dc2626" }}
            disabled={processando}
            onClick={() => setConfirmandoDesativar(true)}
          >
            Desativar
          </button>
        )}
        {usuario.role === "barber" && !usuario.ativo && (
          <button
            className="small-btn"
            style={{ flex: 1, background: "#57534e" }}
            disabled={processando}
            onClick={() => onReativar(usuario.id)}
          >
            Reativar
          </button>
        )}
      </div>
      {usuario.ativo && confirmandoDesativar && (
        <>
          <p className="subtitle" style={{ marginTop: 8, marginBottom: 8 }}>
            Confirma desativar {usuario.nome}? O histórico fica preservado, mas ele deixa de
            aparecer para lançar atendimentos ou fazer login.
          </p>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="small-btn"
              style={{ flex: 1, background: "#a8a29e" }}
              onClick={() => setConfirmandoDesativar(false)}
            >
              Cancelar
            </button>
            <button
              className="small-btn"
              style={{ flex: 1, background: "#dc2626" }}
              disabled={processando}
              onClick={() => onDesativar(usuario.id)}
            >
              {processando ? "Desativando..." : "Confirmar"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
