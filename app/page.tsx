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
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then(setUsuarios)
      .catch(() => setErro("Não foi possível carregar os usuários"));
  }, []);

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

  if (!usuarioSelecionado) {
    return (
      <main>
        <h1>Barbearia</h1>
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
