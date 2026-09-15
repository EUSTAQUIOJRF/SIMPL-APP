import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Image } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { idiomas } from "../i18n/translations";
import { buscarInformacoesDestino, gerarLinkHotelAfiliado } from "../services/travelApi";
import { salvarNoHistorico, alternarFavorito, ehFavorito } from "../historico";

function Secao({ titulo, children }) {
  return (
    <View style={styles.secao}>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

function Linha({ texto }) {
  return <Text style={styles.linhaTexto}>• {texto}</Text>;
}

function LinhaLink({ nome, detalhe, avaliacao, cidade, urlReal }) {
  const query = encodeURIComponent(`${nome} ${cidade || ""}`.trim());
  const url = urlReal || `https://www.google.com/maps/search/?api=1&query=${query}`;

  const detalheCompleto = [detalhe, avaliacao ? `★ ${avaliacao}` : null].filter(Boolean).join(" — ");

  return (
    <TouchableOpacity onPress={() => Linking.openURL(url)}>
      <Text style={styles.linhaTexto}>
        • <Text style={styles.linhaLink}>{nome}</Text>
        {detalheCompleto ? ` — ${detalheCompleto}` : ""}
      </Text>
    </TouchableOpacity>
  );
}

function LinkConfirmarVacina({ destino, paisEmbarque, texto }) {
  const consulta = encodeURIComponent(
    `vacina obrigatória entrar em ${destino} vindo de ${paisEmbarque} site:gov.br OR site:who.int OR site:cdc.gov`
  );
  const url = `https://www.google.com/search?q=${consulta}`;

  return (
    <TouchableOpacity onPress={() => Linking.openURL(url)}>
      <Text style={styles.linkConfirmar}>{texto}</Text>
    </TouchableOpacity>
  );
}

function gerarHtmlPdf(dados, t, contexto) {
  const listaSimples = (itens) => (itens || []).map((i) => `<li>${i}</li>`).join("");

  const listaComDetalhe = (itens, campoDetalhe) =>
    (itens || [])
      .map((i) => {
        const nota = i.avaliacao ? ` (★ ${i.avaliacao})` : "";
        return `<li><strong>${i.nome}</strong> — ${i[campoDetalhe]}${nota}</li>`;
      })
      .join("");

  const secaoRegiao = dados.hoteisRegiaoDesejada
    ? `
    <h2>${t.hoteisRegiao} (${contexto.regiaoDesejada})</h2>
    <ul>${listaComDetalhe(dados.hoteisRegiaoDesejada, "bairro")}</ul>
    <h2>${t.restaurantesRegiao} (${contexto.regiaoDesejada})</h2>
    <ul>${listaComDetalhe(dados.restaurantesRegiaoDesejada, "tipoCozinha")}</ul>
  `
    : "";

  const atracoesLista = Array.isArray(dados.principaisAtracoes) && typeof dados.principaisAtracoes[0] === "object"
    ? listaComDetalhe(dados.principaisAtracoes, "bairro")
    : listaSimples(dados.principaisAtracoes);

  const secaoMoeda = dados.moedaDestino
    ? `
    <h2>${t.moedaLocal}</h2><p>${dados.moedaDestino}</p>
    ${dados.cambio ? `<h2>${t.cambio}</h2><p>${dados.cambio}</p>` : ""}
  `
    : "";

  const secaoMaxMin = dados.temperaturaMaximaEpoca || dados.temperaturaMinimaEpoca
    ? `<h2>${t.maxMinEpoca}</h2><p>${dados.temperaturaMaximaEpoca || "-"} / ${dados.temperaturaMinimaEpoca || "-"}</p>`
    : "";

  const fotoHtml = dados.fotoUrl ? `<img src="${dados.fotoUrl}" 
style="width:100%;max-height:300px;object-fit:cover;border-radius:8px;" />` : "";
  const boasVindasHtml = dados.boasVindas ? `<p style="font-style:italic;color:#475569;">${dados.boasVindas}</p>` : "";

  return `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1e293b; padding: 24px;">
        ${fotoHtml}
        <h1 style="color: #0f172a;">${dados.destino}</h1>
        ${boasVindasHtml}

        <h2>${t.melhorEpoca}</h2><p>${dados.melhorEpoca}</p>
        <h2>${t.tempMediaAno}</h2><p>${dados.temperaturaMediaAno}</p>
        <h2>${t.tempMediaEpoca}</h2><p>${dados.temperaturaMediaEpoca}</p>
        ${secaoMaxMin}
        ${secaoMoeda}
        <h2>${t.precisaVisto}</h2><p>${dados.precisaVisto}</p>
        <h2>${t.vacinaObrigatoria}</h2><p>${dados.vacinaObrigatoria}</p>
        <p style="font-size: 12px; color: #64748b; font-style: italic;">${t.avisoVacina}</p>
        <h2>${t.melhorRegiao}</h2><p>${dados.melhorRegiao}</p>

        <h2>${t.hoteisBemAvaliados}</h2>
        <ul>${listaComDetalhe(dados.hoteisBemAvaliados, "bairro")}</ul>

        <h2>${t.hoteisCustoBeneficio}</h2>
        <ul>${listaComDetalhe(dados.hoteisCustoBeneficio, "bairro")}</ul>

        ${secaoRegiao}

        <h2>${t.distanciaAeroporto}</h2>
        <ul>${listaComDetalhe(dados.distanciaAeroporto?.map((a) => ({ nome: a.aeroporto, distanciaKm: a.distanciaKm })), 
"distanciaKm")}</ul>

        <h2>${t.principaisAtracoes}</h2>
        <ul>${atracoesLista}</ul>

        <h2>${t.atracoesCriancas}</h2>
        <h3>${t.faixa2a5}</h3><ul>${listaSimples(dados.atracoesCriancas?.["2a5"])}</ul>
        <h3>${t.faixa5a8}</h3><ul>${listaSimples(dados.atracoesCriancas?.["5a8"])}</ul>
        <h3>${t.faixa8a12}</h3><ul>${listaSimples(dados.atracoesCriancas?.["8a12"])}</ul>
      </body>
    </html>
  `;
}

export default function ResultsScreen({ route, navigation }) {
  const { contexto, dadosPreCarregados } = route.params;
  const idioma = contexto.idioma || "pt";
  const t = idiomas[idioma];

  const [dados, setDados] = useState(dadosPreCarregados || null);
  const [carregando, setCarregando] = useState(!dadosPreCarregados);
  const [erro, setErro] = useState(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [favorito, setFavorito] = useState(false);

  useEffect(() => {
    async function carregar() {
      // Se já veio pré-carregado (histórico/favoritos), não busca de novo — não gasta a cota
      if (dadosPreCarregados) {
        const jaFavorito = await ehFavorito(contexto);
        setFavorito(jaFavorito);
        return;
      }

      try {
        const resultado = await buscarInformacoesDestino(contexto);
        setDados(resultado);
        await salvarNoHistorico(contexto, resultado);
        const jaFavorito = await ehFavorito(contexto);
        setFavorito(jaFavorito);
      } catch (e) {
        if (e.message === "SEM_LOGIN") {
          setErro(t.erroSemLogin);
        } else if (e.message === "LIMITE_ATINGIDO") {
          setErro(t.erroLimiteAtingido);
        } else if (e.message === "EMAIL_NAO_VERIFICADO") {
          setErro(t.erroEmailNaoVerificado);
        } else {
          setErro(e.message === "SEM_CHAVE" ? t.erroSemChave : t.erroGenerico);
        }
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  async function handleFavoritar() {
    if (!dados) return;
    const novoEstado = await alternarFavorito(contexto, dados);
    setFavorito(novoEstado);
  }

  async function handleBaixarPdf() {
    if (!dados) return;
    setGerandoPdf(true);
    try {
      const html = gerarHtmlPdf(dados, t, contexto);
      const { uri } = await Print.printToFileAsync({ html });

      const podeCompartilhar = await Sharing.isAvailableAsync();
      if (podeCompartilhar) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      }
    } catch (e) {
      setErro(t.erroGenerico);
    } finally {
      setGerandoPdf(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (erro) {
    return (
      <View style={styles.centro}>
        <Text style={styles.erro}>{erro}</Text>
        <TouchableOpacity style={styles.botaoVoltar} onPress={() => navigation.goBack()}>
          <Text style={styles.botaoVoltarTexto}>{t.novaBusca}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cidadeNome = contexto.cidade;
  const atracoesSaoObjetos =
    Array.isArray(dados.principaisAtracoes) && typeof dados.principaisAtracoes[0] === "object";
  const temMaxMin = dados.temperaturaMaximaEpoca || dados.temperaturaMinimaEpoca;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      {dados.fotoUrl && <Image source={{ uri: dados.fotoUrl }} style={styles.fotoDestino} resizeMode="cover" />}

      <View style={{ padding: 20, paddingTop: dados.fotoUrl ? 16 : 60 }}>
        <View style={styles.linhaDestino}>
          <Text style={styles.destino}>{dados.destino}</Text>
          <TouchableOpacity onPress={handleFavoritar} style={styles.botaoFavorito}>
            <Text style={styles.iconeFavorito}>{favorito ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>
        </View>

        {dados.boasVindas && <Text style={styles.boasVindas}>{dados.boasVindas}</Text>}

        <Secao titulo={t.melhorEpoca}>
          <Linha texto={dados.melhorEpoca} />
        </Secao>

        <Secao titulo={t.tempMediaAno}>
          <Linha texto={dados.temperaturaMediaAno} />
        </Secao>

        <Secao titulo={t.tempMediaEpoca}>
          <Linha texto={dados.temperaturaMediaEpoca} />
          {temMaxMin && (
            <Text style={styles.subLinha}>
              {t.maxMinEpoca}: {dados.temperaturaMaximaEpoca || "-"} / {dados.temperaturaMinimaEpoca || "-"}
            </Text>
          )}
        </Secao>

        {dados.moedaDestino && (
          <Secao titulo={t.moedaLocal}>
            <Linha texto={dados.moedaDestino} />
            {dados.cambio && <Text style={styles.subLinha}>{dados.cambio}</Text>}
          </Secao>
        )}

        <Secao titulo={t.precisaVisto}>
          <Linha texto={dados.precisaVisto} />
        </Secao>

        <Secao titulo={t.vacinaObrigatoria}>
          <Linha texto={dados.vacinaObrigatoria} />
          <Text style={styles.avisoOficial}>{t.avisoVacina}</Text>
          <LinkConfirmarVacina
            destino={dados.destino}
            paisEmbarque={contexto.paisEmbarque}
            texto={t.confirmarVacina}
          />
        </Secao>

        <Secao titulo={t.melhorRegiao}>
          <Linha texto={dados.melhorRegiao} />
        </Secao>

        {dados.custoEstimadoUsd && (
          <Secao titulo={t.custoEstimado}>
            <Text style={styles.subTitulo}>{t.nivelMochileiro}</Text>
            <Linha
              texto={`US$ ${dados.custoEstimadoUsd.mochileiro}${
                dados.custoEstimadoConvertido
                  ? ` (≈ ${dados.moedaOrigemSimbolo} ${dados.custoEstimadoConvertido.mochileiro})`
                  : ""
              }`}
            />
            <Text style={styles.subTitulo}>{t.nivelRegular}</Text>
            <Linha
              texto={`US$ ${dados.custoEstimadoUsd.regular}${
                dados.custoEstimadoConvertido
                  ? ` (≈ ${dados.moedaOrigemSimbolo} ${dados.custoEstimadoConvertido.regular})`
                  : ""
              }`}
            />
            <Text style={styles.subTitulo}>{t.nivelPremium}</Text>
            <Linha
              texto={`US$ ${dados.custoEstimadoUsd.premium}${
                dados.custoEstimadoConvertido
                  ? ` (≈ ${dados.moedaOrigemSimbolo} ${dados.custoEstimadoConvertido.premium})`
                  : ""
              }`}
            />
            <Text style={styles.avisoOficial}>{t.avisoCusto}</Text>
          </Secao>
        )}

        <TouchableOpacity
          style={styles.botaoReservar}
          onPress={() => Linking.openURL(gerarLinkHotelAfiliado(contexto))}
        >
          <Text style={styles.botaoReservarTexto}>{t.verPrecosReservar}</Text>
        </TouchableOpacity>

        <Secao titulo={t.hoteisBemAvaliados}>
          {dados.hoteisBemAvaliados?.map((h, i) => (
            <LinhaLink key={i} nome={h.nome} detalhe={h.bairro} avaliacao={h.avaliacao} urlReal={h.mapsUrl} 
cidade={cidadeNome} />
          ))}
        </Secao>

        <Secao titulo={t.hoteisCustoBeneficio}>
          {dados.hoteisCustoBeneficio?.map((h, i) => (
            <LinhaLink key={i} nome={h.nome} detalhe={h.bairro} avaliacao={h.avaliacao} urlReal={h.mapsUrl} 
cidade={cidadeNome} />
          ))}
        </Secao>

        {dados.hoteisRegiaoDesejada && (
          <Secao titulo={`${t.hoteisRegiao} (${contexto.regiaoDesejada})`}>
            {dados.hoteisRegiaoDesejada?.map((h, i) => (
              <LinhaLink key={i} nome={h.nome} detalhe={h.bairro} avaliacao={h.avaliacao} urlReal={h.mapsUrl} 
cidade={cidadeNome} />
            ))}
          </Secao>
        )}

        {dados.restaurantesRegiaoDesejada && (
          <Secao titulo={`${t.restaurantesRegiao} (${contexto.regiaoDesejada})`}>
            {dados.restaurantesRegiaoDesejada?.map((r, i) => (
              <LinhaLink key={i} nome={r.nome} detalhe={r.tipoCozinha} cidade={cidadeNome} />
            ))}
          </Secao>
        )}

        <Secao titulo={t.distanciaAeroporto}>
          {dados.distanciaAeroporto?.map((a, i) => (
            <LinhaLink key={i} nome={a.aeroporto} detalhe={a.distanciaKm} cidade={cidadeNome} />
          ))}
        </Secao>

        <Secao titulo={t.principaisAtracoes}>
          {atracoesSaoObjetos
            ? dados.principaisAtracoes.map((a, i) => (
                <LinhaLink key={i} nome={a.nome} detalhe={a.bairro} avaliacao={a.avaliacao} urlReal={a.mapsUrl} 
cidade={cidadeNome} />
              ))
            : dados.principaisAtracoes?.map((a, i) => <LinhaLink key={i} nome={a} cidade={cidadeNome} />)}
        </Secao>

        <Secao titulo={t.atracoesCriancas}>
          <Text style={styles.subTitulo}>{t.faixa2a5}</Text>
          {dados.atracoesCriancas?.["2a5"]?.map((a, i) => <LinhaLink key={i} nome={a} cidade={cidadeNome} />)}
          <Text style={styles.subTitulo}>{t.faixa5a8}</Text>
          {dados.atracoesCriancas?.["5a8"]?.map((a, i) => <LinhaLink key={i} nome={a} cidade={cidadeNome} />)}
          <Text style={styles.subTitulo}>{t.faixa8a12}</Text>
          {dados.atracoesCriancas?.["8a12"]?.map((a, i) => <LinhaLink key={i} nome={a} cidade={cidadeNome} />)}
        </Secao>

        <TouchableOpacity style={styles.botaoPdf} onPress={handleBaixarPdf} disabled={gerandoPdf}>
          {gerandoPdf ? (
            <ActivityIndicator color="#38bdf8" />
          ) : (
            <Text style={styles.botaoPdfTexto}>{t.baixarPdf}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoVoltar} onPress={() => navigation.popToTop()}>
          <Text style={styles.botaoVoltarTexto}>{t.novaBusca}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  centro: { flex: 1, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center", padding: 24 },
  fotoDestino: { width: "100%", height: 220 },
  linhaDestino: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  destino: { fontSize: 24, fontWeight: "bold", color: "#fff", flexShrink: 1 },
  botaoFavorito: { padding: 8 },
  iconeFavorito: { fontSize: 24 },
  boasVindas: { color: "#94a3b8", fontStyle: "italic", fontSize: 14, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  secao: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  secaoTitulo: { color: "#38bdf8", fontSize: 13, fontWeight: "700", marginBottom: 8, textTransform: "uppercase" },
  subTitulo: { color: "#94a3b8", fontSize: 13, fontWeight: "600", marginTop: 10, marginBottom: 4 },
  subLinha: { color: "#94a3b8", fontSize: 13, marginTop: 4 },
  linhaTexto: { color: "#e2e8f0", fontSize: 15, marginBottom: 4, lineHeight: 20 },
  linhaLink: { color: "#38bdf8", textDecorationLine: "underline" },
  avisoOficial: { color: "#94a3b8", fontSize: 12, fontStyle: "italic", marginTop: 8, lineHeight: 16 },
  linkConfirmar: { color: "#38bdf8", fontSize: 13, fontWeight: "600", marginTop: 8, textDecorationLine: "underline" },
  erro: { color: "#f87171", textAlign: "center", marginBottom: 20 },
  botaoPdf: {
    borderColor: "#38bdf8",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  botaoReservar: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 4,
  },
  botaoReservarTexto: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  botaoPdfTexto: { color: "#38bdf8", fontSize: 16, fontWeight: "600" },
  botaoVoltar: {
    backgroundColor: "#38bdf8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 40,
  },
  botaoVoltarTexto: { color: "#0f172a", fontSize: 16, fontWeight: "600" },
});
