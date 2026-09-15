// Comunicação com o backend (Cloudflare Worker) — não fala mais direto com a Anthropic.
// O Worker esconde as chaves, fornece dados reais de clima/lugares/câmbio/foto, e verifica
// login + limite de uso mensal.

import { obterTokenValido } from "../authApi";

const WORKER_URL = "https://simpl-backend.eustaquiojrf.workers.dev";
const MODEL = "claude-sonnet-4-6";

async function chamarIA(systemPrompt, userMessage, contarUso = true) {
  const token = await obterTokenValido();
  if (!token) {
    throw new Error("SEM_LOGIN");
  }

  const response = await fetch(`${WORKER_URL}/anthropic`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Contar-Uso": contarUso ? "sim" : "nao",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const codigo = data?.erro;
    if (codigo === "LIMITE_ATINGIDO") throw new Error("LIMITE_ATINGIDO");
    if (codigo === "EMAIL_NAO_VERIFICADO") throw new Error("EMAIL_NAO_VERIFICADO");
    if (codigo === "SEM_LOGIN" || codigo === "TOKEN_INVALIDO") throw new Error("SEM_LOGIN");
    throw new Error(data?.mensagem || `Erro no backend: ${response.status}`);
  }

  if (data.error) {
    throw new Error(`Erro da IA: ${data.error.message || "desconhecido"}`);
  }

  const texto = data.content
    .map((bloco) => (bloco.type === "text" ? bloco.text : ""))
    .join("");
  const jsonLimpo = texto.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(jsonLimpo);
  } catch (e) {
    throw new Error("Não foi possível interpretar a resposta da IA. Tente novamente.");
  }
}

async function buscarClimaReal(cidade, pais, mes) {
  try {
    const params = new URLSearchParams({ cidade, pais: pais || "" });
    if (mes) params.set("mes", mes);

    const response = await fetch(`${WORKER_URL}/clima?${params.toString()}`);
    if (!response.ok) return null;

    const dados = await response.json();
    if (dados.erro) return null;

    return dados;
  } catch (e) {
    return null;
  }
}

async function buscarLugares(query, max = 8) {
  try {
    const params = new URLSearchParams({ query, max: String(max) });
    const response = await fetch(`${WORKER_URL}/lugares?${params.toString()}`);
    if (!response.ok) return [];

    const dados = await response.json();
    return dados.lugares || [];
  } catch (e) {
    return [];
  }
}

async function buscarMoedaReal(paisOrigem, paisDestino) {
  try {
    const params = new URLSearchParams({ paisOrigem, paisDestino });
    const response = await fetch(`${WORKER_URL}/moeda?${params.toString()}`);
    if (!response.ok) return null;

    const dados = await response.json();
    if (dados.erro) return null;

    return dados;
  } catch (e) {
    return null;
  }
}

// Busca a taxa de câmbio Dólar -> moeda do país de embarque, pra converter a estimativa de custo
async function buscarTaxaDolar(paisEmbarque) {
  return buscarMoedaReal("Estados Unidos", paisEmbarque);
}

// Notícias de viagem — não exige login nem gasta o limite mensal (é conteúdo público, leve)
export async function buscarNoticiasViagem(idioma = "pt") {
  try {
    const params = new URLSearchParams({ idioma });
    const response = await fetch(`${WORKER_URL}/noticias?${params.toString()}`);
    if (!response.ok) return [];

    const dados = await response.json();
    return dados.noticias || [];
  } catch (e) {
    return [];
  }
}

// Link de afiliado (Travelpayouts / Hotellook) — monta automaticamente com o destino buscado
const TRAVELPAYOUTS_MARKER = "767193";

function converterDataParaISO(dataBr) {
  // dd/mm/aaaa -> aaaa-mm-dd
  const partes = (dataBr || "").split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes;
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

export function gerarLinkHotelAfiliado(contexto) {
  const checkIn = converterDataParaISO(contexto.dataIda);
  const checkOut = converterDataParaISO(contexto.dataVolta) || checkIn;

  const params = new URLSearchParams({
    marker: TRAVELPAYOUTS_MARKER,
    destination: contexto.cidade,
    language: contexto.idioma || "pt",
  });
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);
  if (contexto.pessoas) params.set("adults", contexto.pessoas);

  return `https://search.hotellook.com/?${params.toString()}`;
}

// Cotações de moedas (base dólar) — usadas na barra da tela inicial e no conversor
export async function buscarCotacoes() {
  try {
    const resp = await fetch(`${WORKER_URL}/cotacoes`);
    if (!resp.ok) return null;
    const dados = await resp.json();
    return dados.rates || null;
  } catch (e) {
    return null;
  }
}

// Dica de viagem escrita manualmente pelo dono do app (editável via Cloudflare KV)
export async function buscarDicaDoAdmin() {
  try {
    const resp = await fetch(`${WORKER_URL}/dica`);
    if (!resp.ok) return "";
    const dados = await resp.json();
    return dados.texto || "";
  } catch (e) {
    return "";
  }
}

// Pega a foto real do destino: primeiro acha o "lugar" (a cidade em si) via Places,
// depois resolve a URL de exibição da primeira foto dele.
async function buscarFotoDestino(cidade, pais) {
  try {
    const lugares = await buscarLugares(`${cidade}, ${pais}`, 1);
    const fotoPrincipal = lugares?.[0]?.fotoPrincipal;
    if (!fotoPrincipal) return null;

    const params = new URLSearchParams({ name: fotoPrincipal, max: "1000" });
    const response = await fetch(`${WORKER_URL}/foto?${params.toString()}`);
    if (!response.ok) return null;

    const dados = await response.json();
    return dados.url || null;
  } catch (e) {
    return null;
  }
}

function topAvaliados(lugares, quantidade) {
  return [...lugares]
    .sort((a, b) => (b.avaliacao || 0) - (a.avaliacao || 0))
    .slice(0, quantidade)
    .map((l) => ({
      nome: l.nome,
      bairro: l.endereco,
      avaliacao: l.avaliacao,
      mapsUrl: l.mapsUrl,
    }));
}

function extrairMes(dataIda) {
  const partes = (dataIda || "").split("/");
  if (partes.length >= 2) {
    const mes = parseInt(partes[1], 10);
    if (mes >= 1 && mes <= 12) return mes;
  }
  return null;
}

// -----------------------------
// 1. VERIFICAR CIDADES HOMÔNIMAS
// -----------------------------
const SYSTEM_VERIFICAR_CIDADE = `Você identifica localizações de viagem. Dado um nome de cidade (e opcionalmente
o país), responda APENAS com JSON válido, sem texto extra, neste formato:

Se existir mais de uma cidade conhecida com esse nome, retorne:
{
  "ambiguo": true,
  "opcoes": [
    { "cidade": "string", "regiaoOuEstado": "string", "pais": "string" }
  ]
}
(no máximo 6 opções, mais relevantes/populosas primeiro)

Se for uma cidade única e identificável, retorne:
{
  "ambiguo": false,
  "cidade": "string",
  "regiaoOuEstado": "string",
  "pais": "string"
}

Se não conseguir identificar nenhuma cidade real, retorne:
{ "ambiguo": false, "erro": "cidade não encontrada" }`;

export async function verificarCidadesHomonimas(cidade, pais) {
  const texto = pais ? `Cidade: ${cidade}\nPaís: ${pais}` : `Cidade: ${cidade}`;
  return chamarIA(SYSTEM_VERIFICAR_CIDADE, texto, false);
}

// -----------------------------
// 2. BUSCAR INFORMAÇÕES COMPLETAS DO DESTINO
// -----------------------------
const IDIOMA_NOME = {
  pt: "português do Brasil",
  en: "inglês americano",
  es: "espanhol",
};

function montarSystemPrompt(idioma, temRegiaoDesejada) {
  const idiomaTexto = IDIOMA_NOME[idioma] || IDIOMA_NOME.pt;

  const secaoRegiao = temRegiaoDesejada
    ? `,
  "hoteisRegiaoDesejada": [
    { "nome": "string", "bairro": "string" }
  ],
  "restaurantesRegiaoDesejada": [
    { "nome": "string", "tipoCozinha": "string" }
  ]`
    : "";

  const regraRegiao = temRegiaoDesejada
    ? `\n"hoteisRegiaoDesejada" e "restaurantesRegiaoDesejada" devem ter exatamente 5 itens cada, especificamente
na região informada pelo usuário (não na cidade toda).`
    : "";

  return `Você é um concierge de viagens. Responda SEMPRE em ${idiomaTexto}, com respostas diretas e curtas,
sem frases longas. Responda APENAS com JSON válido, sem texto antes/depois, sem markdown, seguindo EXATAMENTE
este formato:

{
  "destino": "string, ex: Porto Alegre, Brasil",
  "boasVindas": "string curta e calorosa (1 frase), como um concierge dando boas-vindas pessoalmente sobre esse destino 
específico — não genérica",
  "melhorEpoca": "string curta, ex: Maio",
  "temperaturaMediaAno": "string, ex: 26°C",
  "temperaturaMediaEpoca": "string curta, ex: 18°C em média (se não houver data de viagem, repita a média anual)",
  "precisaVisto": "string curta, ex: Sim ou Não (considerando o país de embarque informado)",
  "vacinaObrigatoria": "string curta, ex: Não exige, ou: Sim — Febre Amarela",
  "melhorRegiao": "string curta, ex: Centro",
  "custoEstimadoUsd": {
    "mochileiro": number (custo total em dólares americanos para 5 dias, 1 pessoa, estilo mochileiro/econômico: hostel, 
transporte público, comida de rua/mercado),
    "regular": number (custo total em dólares americanos para 5 dias, 1 pessoa, estilo intermediário: hotel 3 estrelas, 
alguns táxis/apps, restaurantes medianos),
    "premium": number (custo total em dólares americanos para 5 dias, 1 pessoa, estilo alto padrão: hotel 4-5 estrelas, 
carro particular/app o tempo todo, restaurantes bons)
  },
  "hoteisBemAvaliados": [
    { "nome": "string", "bairro": "string" }
  ],
  "hoteisCustoBeneficio": [
    { "nome": "string", "bairro": "string" }
  ],${secaoRegiao}
  "distanciaAeroporto": [
    { "aeroporto": "string", "distanciaKm": "string, ex: 10 km" }
  ],
  "principaisAtracoes": ["string", "string", "string", "string", "string"],
  "atracoesCriancas": {
    "2a5": ["string", "string", "string", "string", "string"],
    "5a8": ["string", "string", "string", "string", "string"],
    "8a12": ["string", "string", "string", "string", "string"]
  }
}

Regras: "hoteisBemAvaliados" e "hoteisCustoBeneficio" devem ter exatamente 5 itens cada.
Todas as listas de atrações para crianças devem ter exatamente 5 itens cada.
"principaisAtracoes" deve ter exatamente 5 itens.
"custoEstimadoUsd" deve conter números realistas em dólar (não strings, não símbolos de moeda), refletindo o
custo de vida real do destino — um destino caro como Nova York ou Zurique deve ter valores bem mais altos que
um destino econômico como Hanói ou La Paz. Considere hospedagem + alimentação + transporte local + 1-2 passeios
pagos, mas NÃO inclua passagem aérea internacional nesse cálculo.
"boasVindas" deve ser calorosa, breve (máximo 20 palavras) e mencionar algo específico do destino
(não pode ser uma frase genérica que sirva pra qualquer lugar).
"precisaVisto" deve responder apenas "Sim" ou "Não" (mais um detalhe muito curto se necessário, ex: "Não (até 90 dias)"),
levando em conta especificamente o PAÍS DE EMBARQUE informado pelo usuário (não assuma nacionalidade brasileira
se outro país de embarque for informado).
"vacinaObrigatoria" deve responder "Não exige" se não houver exigência, ou "Sim — [nome da(s) vacina(s)]" listando
as vacinas obrigatórias para entrada no país, considerando o PAÍS DE EMBARQUE informado. IMPORTANTE: alguns países
de origem (como o Brasil, classificado pela OMS como área de risco de febre amarela) fazem com que o destino exija
certificado internacional de vacinação de QUALQUER viajante vindo de lá, mesmo que o viajante não tenha passado
pelas áreas de risco do próprio país de embarque — avalie essa exigência com atenção redobrada considerando o
país de embarque específico informado, antes de responder "Não exige", já que esse é um erro comum e a informação
incorreta pode impedir o embarque do viajante.${regraRegiao}`;
}

export async function buscarInformacoesDestino(contexto) {
  const {
    cidade,
    pais,
    paisEmbarque,
    dataIda,
    dataVolta,
    pessoas,
    regiaoDesejada,
    idioma = "pt",
  } = contexto;

  const partes = [`Cidade: ${cidade}`, `País: ${pais}`, `País de embarque do viajante: ${paisEmbarque}`];
  if (dataIda) partes.push(`Data de ida: ${dataIda}`);
  if (dataVolta) partes.push(`Data de volta: ${dataVolta}`);
  if (pessoas) partes.push(`Número de pessoas: ${pessoas}`);
  if (regiaoDesejada) partes.push(`Região onde deseja se hospedar: ${regiaoDesejada}`);

  const systemPrompt = montarSystemPrompt(idioma, Boolean(regiaoDesejada));
  const mes = extrairMes(dataIda);
  const localTexto = `${cidade}, ${pais}`;

  const buscas = [
    chamarIA(systemPrompt, partes.join("\n")),
    buscarClimaReal(cidade, pais, mes),
    buscarLugares(`hotéis mais bem avaliados em ${localTexto}`, 8),
    buscarLugares(`hotéis bom custo benefício em ${localTexto}`, 8),
    buscarLugares(`principais atrações turísticas em ${localTexto}`, 8),
    buscarMoedaReal(paisEmbarque, pais),
    buscarFotoDestino(cidade, pais),
  ];

  if (regiaoDesejada) {
    buscas.push(buscarLugares(`hotéis bom custo benefício em ${regiaoDesejada}, ${localTexto}`, 8));
    buscas.push(buscarLugares(`restaurantes bom custo benefício em ${regiaoDesejada}, ${localTexto}`, 8));
  }

  const [
    dadosIA,
    climaReal,
    hoteisBemAvaliadosReal,
    hoteisCustoBeneficioReal,
    atracoesReal,
    moedaReal,
    fotoUrl,
    hoteisRegiaoReal,
    restaurantesRegiaoReal,
  ] = await Promise.all(buscas);

  if (climaReal) {
    dadosIA.temperaturaMediaAno = `${climaReal.temperaturaMediaAnoC}°C`;
    dadosIA.temperaturaMediaEpoca = `${climaReal.temperaturaMediaEpocaC}°C`;
    if (climaReal.temperaturaMaximaEpocaC !== null && climaReal.temperaturaMaximaEpocaC !== undefined) {
      dadosIA.temperaturaMaximaEpoca = `${climaReal.temperaturaMaximaEpocaC}°C`;
    }
    if (climaReal.temperaturaMinimaEpocaC !== null && climaReal.temperaturaMinimaEpocaC !== undefined) {
      dadosIA.temperaturaMinimaEpoca = `${climaReal.temperaturaMinimaEpocaC}°C`;
    }
  }

  if (moedaReal) {
    dadosIA.moedaDestino = `${moedaReal.moedaDestino.nome} (${moedaReal.moedaDestino.codigo}) 
${moedaReal.moedaDestino.simbolo}`;
    dadosIA.cambio = !moedaReal.mesmaMoeda
      ? `1 ${moedaReal.moedaOrigem.codigo} = ${moedaReal.taxaCambio} ${moedaReal.moedaDestino.codigo}`
      : null;

    // Converte o custo estimado (em dólar) pra moeda do país de embarque da pessoa
    if (dadosIA.custoEstimadoUsd && moedaReal.taxaUsdOrigem) {
      const converter = (valorUsd) => Math.round(valorUsd * moedaReal.taxaUsdOrigem);
      dadosIA.custoEstimadoConvertido = {
        mochileiro: converter(dadosIA.custoEstimadoUsd.mochileiro),
        regular: converter(dadosIA.custoEstimadoUsd.regular),
        premium: converter(dadosIA.custoEstimadoUsd.premium),
      };
      dadosIA.moedaOrigemCodigo = moedaReal.moedaOrigem.codigo;
      dadosIA.moedaOrigemSimbolo = moedaReal.moedaOrigem.simbolo;
    }
  }

  if (fotoUrl) {
    dadosIA.fotoUrl = fotoUrl;
  }

  if (hoteisBemAvaliadosReal.length > 0) {
    dadosIA.hoteisBemAvaliados = topAvaliados(hoteisBemAvaliadosReal, 5);
  }

  if (hoteisCustoBeneficioReal.length > 0) {
    dadosIA.hoteisCustoBeneficio = topAvaliados(hoteisCustoBeneficioReal, 5);
  }

  if (atracoesReal.length > 0) {
    dadosIA.principaisAtracoes = topAvaliados(atracoesReal, 5);
  }

  if (regiaoDesejada) {
    if (hoteisRegiaoReal?.length > 0) {
      dadosIA.hoteisRegiaoDesejada = topAvaliados(hoteisRegiaoReal, 5);
    }
    if (restaurantesRegiaoReal?.length > 0) {
      dadosIA.restaurantesRegiaoDesejada = topAvaliados(restaurantesRegiaoReal, 5).map((r) => ({
        nome: r.nome,
        tipoCozinha: r.bairro,
      }));
    }
  }

  return dadosIA;
}
