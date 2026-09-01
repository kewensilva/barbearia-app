"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Periodicidade = "diario" | "semanal" | "quinzenal" | "mensal";
type TipoComissao = "percentual" | "fixo";

type BarbeiroConfig = {
  id: string;
  nome: string;
  comissao: { tipo: TipoComissao; valor: number } | null;
  periodicidade: { periodicidade: Periodicidade; dia_referencia: number | null } | null;
};

const PERIODICIDADES: Periodicidade[] = ["diario", "semanal", "quinzenal", "mensal"];

export default function Configuracoes() {
  return (
    <Suspense fallback={<main />}>
      <ConfiguracoesContent />
    </Suspense>
  );
}

type OrganizacaoInfo = {
  nome: string;
  codigoAcesso: string | null;
  mostrarNomeCliente: boolean;
  pinAreasSensiveis: boolean;
  somenteAdminLanca: boolean;
  pinOperacionalConfigurado: boolean;
};

function ConfiguracoesContent() {
  const router = useRouter();
  const params = useSearchParams();
  const usuarioId = params.get("usuario") ?? "";
  const [barbeiros, setBarbeiros] = useState<BarbeiroConfig[]>([]);
  const [organizacao, setOrganizacao] = useState<OrganizacaoInfo | null>(null);
  const [salvandoOrg, setSalvandoOrg] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    Promise.all([
      fetch("/api/barbeiros-config").then((r) => r.json()),
      fetch("/api/organizacao").then((r) => r.json()),
    ])
      .then(([barbeirosData, orgData]) => {
        setBarbeiros(barbeirosData);
        if (orgData.vinculado) {
          setOrganizacao({
            nome: orgData.nome,
            codigoAcesso: orgData.codigoAcesso,
            mostrarNomeCliente: orgData.mostrarNomeCliente,
            pinAreasSensiveis: orgData.pinAreasSensiveis,
            somenteAdminLanca: orgData.somenteAdminLanca,
            pinOperacionalConfigurado: orgData.pinOperacionalConfigurado,
          });
        }
      })
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function atualizarOrganizacao(patch: {
    mostrarNomeCliente?: boolean;
    pinAreasSensiveis?: boolean;
    somenteAdminLanca?: boolean;
    pinOperacional?: string;
  }) {
    if (!organizacao) return;
    setSalvandoOrg(true);
    const res = await fetch("/api/organizacao", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const dados = await res.json();
    if (res.ok) {
      setOrganizacao({
        nome: dados.nome,
        codigoAcesso: dados.codigoAcesso,
        mostrarNomeCliente: dados.mostrarNomeCliente,
        pinAreasSensiveis: dados.pinAreasSensiveis,
        somenteAdminLanca: dados.somenteAdminLanca,
        pinOperacionalConfigurado: dados.pinOperacionalConfigurado,
      });
    }
    setSalvandoOrg(false);
    return res.ok;
  }

  async function salvarComissao(barberId: string, tipo: TipoComissao, valor: number) {
    setSalvandoId(barberId);
    await fetch("/api/comissao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId, tipo, valor }),
    });
    carregar();
    setSalvandoId(null);
  }

  async function salvarPeriodicidade(
    barberId: string,
    periodicidade: Periodicidade,
    diaReferencia: number | null
  ) {
    setSalvandoId(barberId);
    await fetch("/api/periodicidade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId, periodicidade, diaReferencia }),
    });
    carregar();
    setSalvandoId(null);
  }

  return (
    <main>
      <div className="row">
        <h1>Configurações</h1>
        <button
          className="tag"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => router.push(`/caixa?usuario=${usuarioId}`)}
        >
          voltar
        </button>
      </div>
      <p className="subtitle">Comissão e periodicidade de fechamento por barbeiro</p>

      {organizacao && (
        <div className="card">
          <p className="section-label" style={{ marginTop: 0 }}>Código de acesso da barbearia</p>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, marginBottom: 12 }}>
            {organizacao.codigoAcesso}
          </div>
          <p className="subtitle" style={{ marginBottom: 8 }}>
            Use esse código pra vincular outro dispositivo (celular, tablet do balcão) a esta
            barbearia, na tela inicial.
          </p>

          <p className="section-label">Lançamento de atendimento</p>
          <button
            className={`option-btn ${organizacao.mostrarNomeCliente ? "selected" : ""}`}
            style={{ width: "100%" }}
            disabled={salvandoOrg}
            onClick={() => atualizarOrganizacao({ mostrarNomeCliente: !organizacao.mostrarNomeCliente })}
          >
            {organizacao.mostrarNomeCliente
              ? "Perguntando nome do cliente ✓"
              : "Perguntar nome do cliente no lançamento"}
          </button>
          <button
            className={`option-btn ${organizacao.somenteAdminLanca ? "selected" : ""}`}
            style={{ width: "100%", marginTop: 8 }}
            disabled={salvandoOrg}
            onClick={() =>
              atualizarOrganizacao({ somenteAdminLanca: !organizacao.somenteAdminLanca })
            }
          >
            {organizacao.somenteAdminLanca
              ? "Somente admin lança atendimentos ✓"
              : "Somente admin lança atendimentos?"}
          </button>
          <p className="subtitle" style={{ marginTop: 8, marginBottom: 0 }}>
            Se sim, os barbeiros contratados não lançam pelo próprio usuário — o admin lança
            todos os atendimentos e escolhe o atendente na hora.
          </p>

          {organizacao.somenteAdminLanca && (
            <>
              <PinOperacional
                configurado={organizacao.pinOperacionalConfigurado}
                salvando={salvandoOrg}
                onSalvar={(pin) => atualizarOrganizacao({ pinOperacional: pin })}
              />
              <DispositivosAutorizados />
            </>
          )}

          <p className="section-label">Segurança</p>
          <button
            className={`option-btn ${organizacao.pinAreasSensiveis ? "selected" : ""}`}
            style={{ width: "100%" }}
            disabled={salvandoOrg}
            onClick={() =>
              atualizarOrganizacao({ pinAreasSensiveis: !organizacao.pinAreasSensiveis })
            }
          >
            {organizacao.pinAreasSensiveis
              ? "Exigindo PIN em áreas administrativas ✓"
              : "Exigir PIN em áreas administrativas"}
          </button>
          <p className="subtitle" style={{ marginTop: 8, marginBottom: 0 }}>
            Vale pra relatório, configurações, fechar caixa, despesas, usuários e serviços.
            Desligar remove a confirmação de PIN extra ao entrar nessas telas.
          </p>
        </div>
      )}

      {carregando && <p className="subtitle">Carregando...</p>}
      {!carregando && barbeiros.length === 0 && (
        <p className="subtitle">Nenhum barbeiro contratado cadastrado ainda</p>
      )}

      {barbeiros.map((b) => (
        <BarbeiroCard
          key={b.id}
          barbeiro={b}
          salvando={salvandoId === b.id}
          onSalvarComissao={salvarComissao}
          onSalvarPeriodicidade={salvarPeriodicidade}
        />
      ))}
    </main>
  );
}

function PinOperacional({
  configurado,
  salvando,
  onSalvar,
}: {
  configurado: boolean;
  salvando: boolean;
  onSalvar: (pin: string) => Promise<boolean | undefined>;
}) {
  const [pin, setPin] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvo, setSalvo] = useState(false);

  const podeSalvar = /^\d{4}$/.test(pin) && pin === confirmacao;

  async function salvar() {
    const ok = await onSalvar(pin);
    if (ok) {
      setPin("");
      setConfirmacao("");
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <p className="subtitle" style={{ marginBottom: 8 }}>
        PIN operacional{configurado ? " (já configurado)" : " — ainda não configurado"}: usado
        só pra desbloquear o lançamento de atendimento, sem dar acesso a relatório, despesas,
        configurações, usuários ou serviços.
      </p>
      <input
        className="input"
        inputMode="numeric"
        maxLength={4}
        placeholder="Novo PIN operacional (4 dígitos)"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
      />
      <input
        className="input"
        inputMode="numeric"
        maxLength={4}
        placeholder="Confirme o PIN"
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value.replace(/\D/g, "").slice(0, 4))}
      />
      <button className="small-btn" disabled={!podeSalvar || salvando} onClick={salvar}>
        {salvo ? "Salvo ✓" : salvando ? "Salvando..." : "Salvar PIN operacional"}
      </button>
    </div>
  );
}

type Dispositivo = { id: string; device_id: string; nome: string | null; criado_em: string };

function DispositivosAutorizados() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [autorizado, setAutorizado] = useState(false);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nomeNovo, setNomeNovo] = useState("");
  const [processando, setProcessando] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    fetch("/api/dispositivos-autorizados")
      .then((r) => r.json())
      .then((dados) => {
        setDeviceId(dados.deviceId);
        setAutorizado(dados.autorizado);
        setDispositivos(dados.dispositivos ?? []);
      })
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function autorizarEsteDispositivo() {
    if (nomeNovo.trim() === "") return;
    setProcessando("novo");
    await fetch("/api/dispositivos-autorizados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeNovo }),
    });
    setNomeNovo("");
    carregar();
    setProcessando(null);
  }

  async function remover(id: string) {
    setProcessando(id);
    await fetch(`/api/dispositivos-autorizados/${id}`, { method: "DELETE" });
    carregar();
    setProcessando(null);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <p className="section-label" style={{ marginTop: 0 }}>Dispositivos autorizados a lançar</p>
      <p className="subtitle" style={{ marginBottom: 8 }}>
        Com "somente admin lança" ligado, o lançamento só funciona nos dispositivos autorizados
        aqui — mesmo com o PIN certo, um aparelho não autorizado é bloqueado.
      </p>

      {carregando && <p className="subtitle">Carregando...</p>}

      {!carregando && !autorizado && deviceId && (
        <div className="card">
          <p className="subtitle" style={{ marginBottom: 8 }}>
            Este dispositivo ainda não está autorizado.
          </p>
          <input
            className="input"
            placeholder="Apelido (ex: Tablet do balcão)"
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
          />
          <button
            className="small-btn"
            disabled={nomeNovo.trim() === "" || processando === "novo"}
            onClick={autorizarEsteDispositivo}
          >
            {processando === "novo" ? "Autorizando..." : "Autorizar este dispositivo"}
          </button>
        </div>
      )}

      {!carregando && dispositivos.length === 0 && (
        <p className="subtitle" style={{ color: "#dc2626" }}>
          Nenhum dispositivo autorizado ainda — o lançamento vai ficar bloqueado em todo lugar
          até autorizar pelo menos um.
        </p>
      )}

      {dispositivos.map((d) => (
        <div key={d.id} className="card" style={{ padding: 12 }}>
          <div className="row">
            <div>
              <div>
                {d.nome ?? "Sem apelido"}
                {d.device_id === deviceId ? " (este dispositivo)" : ""}
              </div>
              <div className="subtitle" style={{ marginBottom: 0 }}>
                autorizado em {new Date(d.criado_em).toLocaleDateString("pt-BR")}
              </div>
            </div>
            <button
              className="small-btn"
              style={{ width: "auto", marginTop: 0, background: "#dc2626" }}
              disabled={processando === d.id}
              onClick={() => remover(d.id)}
            >
              Remover
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BarbeiroCard({
  barbeiro,
  salvando,
  onSalvarComissao,
  onSalvarPeriodicidade,
}: {
  barbeiro: BarbeiroConfig;
  salvando: boolean;
  onSalvarComissao: (barberId: string, tipo: TipoComissao, valor: number) => void;
  onSalvarPeriodicidade: (
    barberId: string,
    periodicidade: Periodicidade,
    diaReferencia: number | null
  ) => void;
}) {
  const [tipo, setTipo] = useState<TipoComissao>(barbeiro.comissao?.tipo ?? "percentual");
  const [valor, setValor] = useState(String(barbeiro.comissao?.valor ?? ""));
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>(
    barbeiro.periodicidade?.periodicidade ?? "semanal"
  );
  const [diaReferencia, setDiaReferencia] = useState(
    barbeiro.periodicidade?.dia_referencia != null ? String(barbeiro.periodicidade.dia_referencia) : ""
  );

  const valorNumero = Number(valor.replace(",", "."));
  const podeSalvarComissao = valor !== "" && valorNumero > 0;

  return (
    <div className="card">
      <h1 style={{ fontSize: 17 }}>{barbeiro.nome}</h1>

      <p className="section-label">Comissão</p>
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <button
          className={`option-btn ${tipo === "percentual" ? "selected" : ""}`}
          onClick={() => setTipo("percentual")}
        >
          Percentual
        </button>
        <button className={`option-btn ${tipo === "fixo" ? "selected" : ""}`} onClick={() => setTipo("fixo")}>
          Valor fixo
        </button>
      </div>
      <input
        className="input"
        inputMode="decimal"
        placeholder={tipo === "percentual" ? "Ex: 50 (%)" : "Ex: 20 (R$ por corte)"}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
      />
      <button
        className="small-btn"
        disabled={!podeSalvarComissao || salvando}
        onClick={() => onSalvarComissao(barbeiro.id, tipo, valorNumero)}
      >
        Salvar comissão
      </button>

      <p className="section-label">Periodicidade de fechamento</p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {PERIODICIDADES.map((p) => (
          <button
            key={p}
            className={`option-btn ${periodicidade === p ? "selected" : ""}`}
            style={{ flex: "1 1 40%" }}
            onClick={() => setPeriodicidade(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <input
        className="input"
        style={{ marginTop: 12 }}
        inputMode="numeric"
        placeholder="Dia de referência (opcional)"
        value={diaReferencia}
        onChange={(e) => setDiaReferencia(e.target.value)}
      />
      <button
        className="small-btn"
        disabled={salvando}
        onClick={() =>
          onSalvarPeriodicidade(
            barbeiro.id,
            periodicidade,
            diaReferencia === "" ? null : Number(diaReferencia)
          )
        }
      >
        Salvar periodicidade
      </button>
    </div>
  );
}
