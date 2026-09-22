// Histórico e favoritos ficam salvos localmente no aparelho (AsyncStorage), por usuário.
// Guardamos o resultado completo já buscado, assim reabrir um item do histórico ou dos
// favoritos NÃO consome uma busca nova (não gasta o limite mensal).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { obterSessaoSalva } from "./authApi";

const MAX_HISTORICO = 20;

async function chaveDoUsuario(prefixo) {
  const sessao = await obterSessaoSalva();
  const uid = sessao?.uid || "anonimo";
  return `${prefixo}:${uid}`;
}

async function lerLista(prefixo) {
  const chave = await chaveDoUsuario(prefixo);
  const bruto = await AsyncStorage.getItem(chave);
  return bruto ? JSON.parse(bruto) : [];
}

async function salvarLista(prefixo, lista) {
  const chave = await chaveDoUsuario(prefixo);
  await AsyncStorage.setItem(chave, JSON.stringify(lista));
}

function idDoItem(contexto) {
  return `${contexto.cidade}|${contexto.pais}`.toLowerCase();
}

// ---------- HISTÓRICO ----------

export async function salvarNoHistorico(contexto, dados) {
  const lista = await lerLista("historico");
  const id = idDoItem(contexto);
  const semODuplicado = lista.filter((item) => idDoItem(item.contexto) !== id);
  const novaLista = [{ id, contexto, dados, timestamp: Date.now() }, ...semODuplicado].slice(0, MAX_HISTORICO);
  await salvarLista("historico", novaLista);
}

export async function obterHistorico() {
  return lerLista("historico");
}

// ---------- FAVORITOS ----------

export async function obterFavoritos() {
  return lerLista("favoritos");
}

export async function ehFavorito(contexto) {
  const lista = await obterFavoritos();
  const id = idDoItem(contexto);
  return lista.some((item) => item.id === id);
}

export async function alternarFavorito(contexto, dados) {
  const lista = await obterFavoritos();
  const id = idDoItem(contexto);
  const jaEsta = lista.some((item) => item.id === id);

  const novaLista = jaEsta
    ? lista.filter((item) => item.id !== id)
    : [{ id, contexto, dados, timestamp: Date.now() }, ...lista];

  await salvarLista("favoritos", novaLista);
  return !jaEsta; // retorna o novo estado (true = virou favorito, false = removeu)
}

