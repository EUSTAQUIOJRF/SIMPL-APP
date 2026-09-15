// Autenticação via API REST do Firebase (sem o SDK completo, que não empacota bem no Snack).
// Documentação: https://firebase.google.com/docs/reference/rest/auth

import AsyncStorage from "@react-native-async-storage/async-storage";

const API_KEY = "AIzaSyBGjaL3SALoN-A8vvldMgh8JXPM09Oln64";
const BASE_AUTH = "https://identitytoolkit.googleapis.com/v1/accounts";
const BASE_TOKEN = "https://securetoken.googleapis.com/v1/token";
const CHAVE_SESSAO = "simpl_sessao";

async function chamarFirebase(url, corpo) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const dados = await resp.json();
  if (!resp.ok) {
    throw new Error(dados.error?.message || "ERRO_DESCONHECIDO");
  }
  return dados;
}

async function salvarSessao(dados) {
  const sessao = {
    idToken: dados.idToken,
    refreshToken: dados.refreshToken,
    uid: dados.localId,
    email: dados.email,
    expiraEm: Date.now() + parseInt(dados.expiresIn || "3600", 10) * 1000,
  };
  await AsyncStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  return sessao;
}

export async function registrar(email, senha) {
  const dados = await chamarFirebase(`${BASE_AUTH}:signUp?key=${API_KEY}`, {
    email,
    password: senha,
    returnSecureToken: true,
  });
  const sessao = await salvarSessao(dados);
  // Dispara automaticamente o e-mail de confirmação assim que a conta é criada
  await enviarEmailVerificacao(sessao.idToken).catch(() => {});
  return sessao;
}

export async function enviarEmailVerificacao(idToken) {
  return chamarFirebase(`${BASE_AUTH}:sendOobCode?key=${API_KEY}`, {
    requestType: "VERIFY_EMAIL",
    idToken,
  });
}

export async function entrar(email, senha) {
  const dados = await chamarFirebase(`${BASE_AUTH}:signInWithPassword?key=${API_KEY}`, {
    email,
    password: senha,
    returnSecureToken: true,
  });
  return salvarSessao(dados);
}

export async function sair() {
  await AsyncStorage.removeItem(CHAVE_SESSAO);
}

export async function obterSessaoSalva() {
  const bruto = await AsyncStorage.getItem(CHAVE_SESSAO);
  return bruto ? JSON.parse(bruto) : null;
}

// Retorna um idToken válido, renovando automaticamente se estiver expirado ou perto de expirar
export async function obterTokenValido() {
  const sessao = await obterSessaoSalva();
  if (!sessao) return null;

  if (Date.now() < sessao.expiraEm - 60000) {
    return sessao.idToken;
  }

  try {
    const resp = await fetch(`${BASE_TOKEN}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${sessao.refreshToken}`,
    });
    const dados = await resp.json();
    if (!resp.ok) throw new Error("falha ao renovar sessão");

    const novaSessao = {
      idToken: dados.id_token,
      refreshToken: dados.refresh_token,
      uid: dados.user_id,
      email: sessao.email,
      expiraEm: Date.now() + parseInt(dados.expires_in, 10) * 1000,
    };
    await AsyncStorage.setItem(CHAVE_SESSAO, JSON.stringify(novaSessao));
    return novaSessao.idToken;
  } catch (e) {
    await sair();
    return null;
  }
}

export function traduzErroFirebase(mensagem) {
  const mapa = {
    EMAIL_EXISTS: "Esse e-mail já está cadastrado.",
    OPERATION_NOT_ALLOWED: "Login por e-mail/senha não está ativado.",
    INVALID_EMAIL: "E-mail inválido.",
    WEAK_PASSWORD: "A senha precisa ter pelo menos 6 caracteres.",
    EMAIL_NOT_FOUND: "Usuário não encontrado.",
    INVALID_PASSWORD: "Senha incorreta.",
    INVALID_LOGIN_CREDENTIALS: "E-mail ou senha incorretos.",
    USER_DISABLED: "Essa conta foi desativada.",
    MISSING_PASSWORD: "Digite uma senha.",
    MISSING_EMAIL: "Digite um e-mail.",
    TOO_MANY_ATTEMPTS_TRY_LATER: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
    USER_NOT_FOUND: "Usuário não encontrado.",
    INVALID_ID_TOKEN: "Sessão inválida. Faça login novamente.",
    CREDENTIAL_MISMATCH: "E-mail ou senha incorretos.",
  };
  const chave = Object.keys(mapa).find((k) => mensagem?.startsWith(k));
  // Enquanto estamos testando: se não reconhecer o código, mostra ele mesmo (temporário, pra diagnosticar)
  return chave ? mapa[chave] : `Não foi possível processar. Código: ${mensagem}`;
}
