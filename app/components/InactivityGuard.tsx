"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const TIMEOUT_MS = 5 * 60 * 1000;
const EVENTOS = ["click", "keydown", "touchstart", "mousemove", "scroll"] as const;

export default function InactivityGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Tela de seleção de usuário: ainda não há sessão "ativa" para expirar.
    if (pathname === "/") return;

    function reiniciar() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.push("/"), TIMEOUT_MS);
    }

    EVENTOS.forEach((evento) => window.addEventListener(evento, reiniciar));
    reiniciar();

    return () => {
      EVENTOS.forEach((evento) => window.removeEventListener(evento, reiniciar));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pathname, router]);

  return null;
}
