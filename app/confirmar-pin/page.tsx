"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConfirmarPin() {
  return (
    <Suspense fallback={<main />}>
      <ConfirmarPinContent />
    </Suspense>
  );
}

function ConfirmarPinContent() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";
  const destino = params.get("destino") ?? "/";

  const [nomeUsuario, setNomeUsuario] = useState("");
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((usuarios: { id: string; nome: string }[]) => {
        setNomeUsuario(usuarios.find((u) => u.id === usuarioId)?.nome ?? "");
      });
  }, [usuarioId]);

  async function digitar(numero: string) {
    if (pin.length >= 4 || verificando) return;
    const novoPin = pin + numero;
    setPin(novoPin);
    setErro(null);

    if (novoPin.length === 4) {
      setVerificando(true);
      try {
        const res = await fetch("/api/auth/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuarioId, pin: novoPin }),
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
          router.push(`${destino}?usuario=${usuarioId}`);
          return;
        } else {
          setErro("PIN incorreto, tente de novo");
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

  return (
    <main>
      <h1>Confirme seu PIN</h1>
      <p className="subtitle">
        {nomeUsuario ? `${nomeUsuario} · área restrita` : "área restrita"}
      </p>
      <p className="subtitle" style={{ marginTop: -16 }}>{erro ?? "Digite seu PIN novamente"}</p>

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
        <button onClick={() => router.back()}>voltar</button>
        <button onClick={() => digitar("0")}>0</button>
        <button onClick={() => setPin(pin.slice(0, -1))}>⌫</button>
      </div>
    </main>
  );
}
