"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Usuario = {
  id: string;
  nome: string;
  role: "admin" | "barber";
};

export default function Home() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [vinculado, setVinculado] = useState(false);
  const [nomeBarbearia, setNomeBarbearia] = useState("");

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  function verificarVinculo() {
    setCarregando(true);
    fetch("/api/organizacao")
      .then((r) => r.json())
      .then((dados) => {
        setVinculado(dados.vinculado);
        setNomeBarbearia(dados.nome ?? "");
        if (dados.vinculado) {
          return fetch("/api/usuarios")
            .then((r) => r.json())
            .then(setUsuarios);
        }
      })
      .finally(() => setCarregando(false));
  }

  useEffect(verificarVinculo, []);

  async function digitar(numero: string) {
    if (pin.length >= 4 || verificando) return;
    const novoPin = pin + numero;
    setPin(novoPin);
    setErro(null);

    if (novoPin.length === 4 && usuarioSelecionado) {
      setVerificando(true);
      try {
        const res = await fetch("/api/auth/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuarioId: usuarioSelecionado.id, pin: novoPin }),
        });
        const dados = await res.json();

        if (res.status === 423) {
          const ate = new Date(dados.bloqueadoAte).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          setErro(`Bloqueado até ${ate}`);
          setPin("");
        } else if (dados.ok) {
          const destino = dados.usuario.role === "admin" ? "/caixa" : "/lancamento";
          router.push(`${destino}?usuario=${dados.usuario.id}`);
          return;
        } else {
          setErro(dados.bloqueadoAte ? "PIN incorreto. Bloqueado por tentativas." : "PIN incorreto, tente de novo");
          setPin("");
        }
      } catch {
        setErro("Falha ao validar PIN, tente de novo");
        setPin("");
      } finally {
        setVerificando(false);
      }
    }
  }

  if (carregando) {
    return <main />;
  }

  if (!vinculado) {
    return <OnboardingDispositivo onVinculado={verificarVinculo} />;
  }

  if (!usuarioSelecionado) {
    return (
      <main>
        <h1>{nomeBarbearia || "Barbearia"}</h1>
        <p className="subtitle">Quem é você?</p>
        {usuarios.map((u) => (
          <button
            key={u.id}
            className="user-btn"
            onClick={() => setUsuarioSelecionado(u)}
          >
            {u.nome}
          </button>
        ))}
      </main>
    );
  }

  return (
    <main>
      <h1>Olá, {usuarioSelecionado.nome.split(" ")[0]}</h1>
      <p className="subtitle">{erro ?? "Digite seu PIN"}</p>

      <div className="pin-dots">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`pin-dot ${i < pin.length ? "filled" : ""}`} />
        ))}
      </div>

      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <button key={n} onClick={() => digitar(n)}>
            {n}
          </button>
        ))}
        <button
          onClick={() => {
            setUsuarioSelecionado(null);
            setPin("");
            setErro(null);
          }}
        >
          voltar
        </button>
        <button onClick={() => digitar("0")}>0</button>
        <button onClick={() => setPin(pin.slice(0, -1))}>⌫</button>
      </div>
    </main>
  );
}

function OnboardingDispositivo({ onVinculado }: { onVinculado: () => void }) {
  const [modo, setModo] = useState<"cadastro" | "entrar">("cadastro");

  const [nomeBarbearia, setNomeBarbearia] = useState("");
  const [nomeAdmin, setNomeAdmin] = useState("");
  const [pinCadastro, setPinCadastro] = useState("");
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);

  const [codigo, setCodigo] = useState("");

  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const podeCadastrar =
    nomeBarbearia.trim() !== "" && nomeAdmin.trim() !== "" && /^\d{4}$/.test(pinCadastro);

  async function cadastrar() {
    setProcessando(true);
    setErro(null);
    const res = await fetch("/api/organizacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomeBarbearia, nomeAdmin, pin: pinCadastro }),
    });
    const dados = await res.json();
    if (!res.ok) {
      setErro(dados.erro ?? "Erro ao cadastrar barbearia");
    } else {
      setCodigoGerado(dados.codigoAcesso);
    }
    setProcessando(false);
  }

  async function entrar() {
    setProcessando(true);
    setErro(null);
    const res = await fetch("/api/organizacoes/entrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
    });
    const dados = await res.json();
    if (!res.ok) {
      setErro(dados.erro ?? "Código não encontrado");
    } else {
      onVinculado();
    }
    setProcessando(false);
  }

  if (codigoGerado) {
    return (
      <main>
        <h1>Barbearia cadastrada!</h1>
        <p className="subtitle">
          Guarde este código — é ele que você vai usar pra vincular outros
          dispositivos (celular, tablet do balcão) a esta barbearia.
        </p>
        <div className="card" style={{ textAlign: "center" }}>
          <p className="subtitle" style={{ marginBottom: 4 }}>Código de acesso</p>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 4 }}>
            {codigoGerado}
          </div>
        </div>
        <button className="primary-btn" onClick={onVinculado}>
          Continuar
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>Bem-vindo</h1>
      <p className="subtitle">Primeiro acesso deste dispositivo</p>

      <div className="row" style={{ gap: 8, marginBottom: 20 }}>
        <button
          className={`option-btn ${modo === "cadastro" ? "selected" : ""}`}
          onClick={() => {
            setModo("cadastro");
            setErro(null);
          }}
        >
          Cadastrar barbearia
        </button>
        <button
          className={`option-btn ${modo === "entrar" ? "selected" : ""}`}
          onClick={() => {
            setModo("entrar");
            setErro(null);
          }}
        >
          Já tenho uma barbearia
        </button>
      </div>

      {erro && <p className="subtitle" style={{ color: "#dc2626" }}>{erro}</p>}

      {modo === "cadastro" ? (
        <>
          <input
            className="input"
            placeholder="Nome da barbearia"
            value={nomeBarbearia}
            onChange={(e) => setNomeBarbearia(e.target.value)}
          />
          <input
            className="input"
            placeholder="Seu nome (dono/admin)"
            value={nomeAdmin}
            onChange={(e) => setNomeAdmin(e.target.value)}
          />
          <input
            className="input"
            inputMode="numeric"
            maxLength={4}
            placeholder="Crie seu PIN de 4 dígitos"
            value={pinCadastro}
            onChange={(e) => setPinCadastro(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          <button
            className="primary-btn"
            disabled={!podeCadastrar || processando}
            onClick={cadastrar}
          >
            {processando ? "Cadastrando..." : "Cadastrar barbearia"}
          </button>
        </>
      ) : (
        <>
          <input
            className="input"
            placeholder="Código de acesso (ex: KWN482)"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          />
          <button
            className="primary-btn"
            disabled={codigo.trim() === "" || processando}
            onClick={entrar}
          >
            {processando ? "Entrando..." : "Vincular este dispositivo"}
          </button>
        </>
      )}
    </main>
  );
}
