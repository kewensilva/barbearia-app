"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usuarios } from "@/lib/mockData";

// TODO (backend real): validar PIN via Supabase (hash bcrypt na tabela users),
// registrar tentativas falhas e bloqueio temporário conforme CLAUDE.md.
const PIN_MOCK = "1234"; // qualquer usuário aceita este PIN neste esqueleto

export default function Home() {
  const router = useRouter();
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<
    (typeof usuarios)[number] | null
  >(null);
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState(false);

  function digitar(numero: string) {
    if (pin.length >= 4) return;
    const novoPin = pin + numero;
    setPin(novoPin);
    setErro(false);

    if (novoPin.length === 4) {
      setTimeout(() => {
        if (novoPin === PIN_MOCK) {
          const destino =
            usuarioSelecionado?.role === "admin" ? "/caixa" : "/lancamento";
          router.push(`${destino}?usuario=${usuarioSelecionado?.id}`);
        } else {
          setErro(true);
          setPin("");
        }
      }, 150);
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
      <p className="subtitle">
        {erro ? "PIN incorreto, tente de novo" : "Digite seu PIN"}
      </p>

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
        <button onClick={() => setUsuarioSelecionado(null)}>voltar</button>
        <button onClick={() => digitar("0")}>0</button>
        <button onClick={() => setPin(pin.slice(0, -1))}>⌫</button>
      </div>

      <p className="subtitle" style={{ marginTop: 24, textAlign: "center" }}>
        (PIN de teste neste esqueleto: 1234)
      </p>
    </main>
  );
}
