// Código curto de acesso à organization, usado para vincular um novo
// dispositivo/navegador a uma barbearia já cadastrada. Evita caracteres
// ambíguos (0/O, 1/I) para digitação manual.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function gerarCodigoAcesso(): string {
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return codigo;
}
