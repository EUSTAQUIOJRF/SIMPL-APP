import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Image, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import ViewShot from "react-native-view-shot";
import { LinearGradient } from "expo-linear-gradient";
import { idiomas } from "../i18n/translations";
import { buscarInformacoesDestino, gerarLinkHotelAfiliado } from "../services/travelApi";
import { salvarNoHistorico, alternarFavorito, ehFavorito } from "../historico";

function CardInfo({ label, valor }) {
  return (
    <View style={styles.cardInfo}>
      <Text style={styles.labelCard}>{label}</Text>
      <Text style={styles.valorCard}>{valor}</Text>
    </View>
  );
}

function ItemLink({ nome, detalhe, avaliacao, cidade, urlReal }) {
  const query = encodeURIComponent(`${nome} ${cidade || ""}`.trim());
  const url = urlReal || `https://www.google.com/maps/search/?api=1&query=${query}`;
  const detalheCompleto = [detalhe, avaliacao ? `★ ${avaliacao}` : null].filter(Boolean).join(" • ");

  return (
    <TouchableOpacity style={styles.itemAtracao} onPress={() => Linking.openURL(url)}>
      <Text style={styles.nomeAtracao}>{nome}</Text>
      {detalheCompleto ? <Text style={styles.detalheAtracao}>{detalheCompleto}</Text> : null}
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

// -----------------------------
// CARD VISUAL COMPARTILHÁVEL (vira imagem de verdade, não texto)
// -----------------------------
function CardCompartilhavelImagem({ dados, contexto, t }) {
  const [formato, setFormato] = useState("post"); // "post" (4:5) | "story" (9:16)
  const [compartilhando, setCompartilhando] = useState(false);
  const viewShotRef = useRef(null);

  async function handleCompartilhar() {
    if (!viewShotRef.current) return;
    setCompartilhando(true);
    try {
      const uri = await viewShotRef.current.capture();
      const podeCompartilhar = await Sharing.isAvailableAsync();
      if (podeCompartilhar) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t.cardResumoTitulo });
      }
    } catch (e) {
      // silencioso — se falhar, a pessoa só tenta de novo
    } finally {
      setCompartilhando(false);
    }
  }

  const aspectRatio = formato === "post" ? 4 / 5 : 9 / 16;

  return (
    <View style={styles.blocoCompartilhar}>
      <Text style={styles.tituloBlocoCompartilhar}>📤 {t.cardResumoTitulo}</Text>

      <View style={styles.linhaFormato}>
        <TouchableOpacity
          style={[styles.botaoFormato, formato === "post" && styles.botaoFormatoAtivo]}
          onPress={() => setFormato("post")}
        >
          <Text style={[styles.textoBotaoFormato, formato === "post" && styles.textoBotaoFormatoAtivo]}>
            Post (4:5)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.botaoFormato, formato === "story" && styles.botaoFormatoAtivo]}
          onPress={() => setFormato("story")}
        >
          <Text style={[styles.textoBotaoFormato, formato === "story" && styles.textoBotaoFormatoAtivo]}>
            Story (9:16)
          </Text>
        </TouchableOpacity>
      </View>

      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
        <View style={[styles.cartaoImagem, { aspectRatio }]}>
          <LinearGradient
            colors={["#0b1f3a", "#16294f", "#0d1f3d"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Círculo decorativo */}
          <View style={styles.circuloDecorativo} />
          {/* Onda decorativa na base */}
          <View style={styles.ondaDecorativa} />

          <View style={styles.conteudoCartao}>
            <Text style={styles.tituloCartao}>{dados.destino}</Text>
            {dados.boasVindas ? <Text style={styles.subtituloCartao}>{dados.boasVindas}</Text> : null}

            {dados.fotoUrl ? (
              <Image source={{ uri: dados.fotoUrl }} style={styles.fotoCartao} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <View style={styles.rodapeCartao}>
              <View style={styles.linhaSeparadora} />
              <View style={styles.linhaInfoCartao}>
                <Text style={styles.iconeInfoCartao}>📍</Text>
                <Text style={styles.textoInfoCartao}>{dados.destino}</Text>
              </View>
              <View style={styles.linhaInfoCartao}>
                <Text style={styles.iconeInfoCartao}>🗓️</Text>
                <Text style={styles.textoInfoCartao}>
                  {t.melhorEpoca}: <Text style={{ fontWeight: "700" }}>{dados.melhorEpoca}</Text>
                </Text>
              </View>
              {dados.temperaturaMediaEpoca ? (
                <View style={styles.linhaInfoCartao}>
                  <Text style={styles.iconeInfoCartao}>🌡️</Text>
                  <Text style={styles.textoInfoCartao}>{dados.temperaturaMediaEpoca}</Text>
                </View>
              ) : null}
              <View style={styles.marcaCartao}>
                <Text style={styles.textoMarcaCartao}>✈️ SIMPL — {t.tagline || "seu concierge de viagens"}</Text>
              </View>
            </View>
          </View>
        </View>
      </ViewShot>

      <TouchableOpacity style={styles.botaoCompartilharImagem} onPress={handleCompartilhar} disabled={compartilhando}>
        {compartilhando ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.textoBotaoCompartilharImagem}>{t.tocarParaCompartilhar}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function gerarHtmlPdf(dados, t, contexto) {
  const listaSimples = (itens) => (itens || []).map((i) => `<li>${i}</li>`).join("");
  const listaComDetalhe = (itens, campo) =>
    (itens || [])
      .map((i) => `<li><strong>${i.nome}</strong> — ${i[campo]}${i.avaliacao ? ` (★ ${i.avaliacao})` : ""}</li>`)
      .join("");

  const secaoRegiao = dados.hoteisRegiaoDesejada
    ? `<h2>${t.hoteisRegiao} (${contexto.regiaoDesejada})</h2><ul>${listaComDetalhe(dados.hoteisRegiaoDesejada, "bairro")}</ul>
       <h2>${t.restaurantesRegiao} (${contexto.regiaoDesejada})</h2><ul>${listaComDetalhe(dados.restaurantesRegiaoDesejada, "tipoCozinha")}</ul>`
    : "";

  const atracoesLista =
    Array.isArray(dados.principaisAtracoes) && typeof dados.principaisAtracoes[0] === "object"
      ? listaComDetalhe(dados.principaisAtracoes, "bairro")
      : listaSimples(dados.principaisAtracoes);

  const secaoCusto = dados.custoEstimadoUsd
    ? `<h2>${t.custoEstimado}</h2>
       <p>${t.nivelMochileiro}: US$ ${dados.custoEstimadoUsd.mochileiro}${dados.custoEstimadoConvertido ? ` (≈ ${dados.moedaOrigemSimbolo} ${dados.custoEstimadoConvertido.mochileiro})` : ""}</p>
       <p>${t.nivelRegular}: US$ ${dados.custoEstimadoUsd.regular}${dados.custoEstimadoConvertido ? ` (≈ ${dados.moedaOrigemSimbolo} ${dados.custoEstimadoConvertido.regular})` : ""}</p>
       <p>${t.nivelPremium}: US$ ${dados.custoEstimadoUsd.premium}${dados.custoEstimadoConvertido ? ` (≈ ${dados.moedaOrigemSimbolo} ${dados.custoEstimadoConvertido.premium})` : ""}</p>
       <p style="font-size:12px;color:#64748b;font-style:italic;">${t.avisoCusto}</p>`
    : "";

  const fotoHtml = dados.fotoUrl ? `<img src="${dados.fotoUrl}" style="width:100%;max-height:300px;object-fit:cover;border-radius:8px;" />` : "";

  return `
    <html><head><meta charset="utf-8" /></head>
      <body style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1e293b;padding:24px;">
        ${fotoHtml}
        <h1 style="color:#0f172a;">${dados.destino}</h1>
        ${dados.boasVindas ? `<p style="font-style:italic;color:#475569;">${dados.boasVindas}</p>` : ""}
        <h2>${t.melhorEpoca}</h2><p>${dados.melhorEpoca}</p>
        <h2>${t.tempMediaAno}</h2><p>${dados.temperaturaMediaAno}</p>
        <h2>${t.tempMediaEpoca}</h2><p>${dados.temperaturaMediaEpoca}</p>
        ${dados.moedaDestino ? `<h2>${t.moedaLocal}</h2><p>${dados.moedaDestino}</p>${dados.cambio ? `<h2>${t.cambio}</h2><p>${dados.cambio}</p>` : ""}` : ""}
        <h2>${t.precisaVisto}</h2><p>${dados.precisaVisto}</p>
        <h2>${t.vacinaObrigatoria}</h2><p>${dados.vacinaObrigatoria}</p>
        <p style="font-size:12px;color:#64748b;font-style:italic;">${t.avisoVacina}</p>
        <h2>${t.melhorRegiao}</h2><p>${dados.melhorRegiao}</p>
        ${secaoCusto}
        <h2>${t.hoteisBemAvaliados}</h2><ul>${listaComDetalhe(dados.hoteisBemAvaliados, "bairro")}</ul>
        <h2>${t.hoteisCustoBeneficio}</h2><ul>${listaComDetalhe(dados.hoteisCustoBeneficio, "bairro")}</ul>
        ${secaoRegiao}
        <h2>${t.distanciaAeroporto}</h2><ul>${listaComDetalhe(dados.distanciaAeroporto?.map((a) => ({ nome: a.aeroporto, distanciaKm: a.distanciaKm })), "distanciaKm")}</ul>
        <h2>${t.principaisAtracoes}</h2><ul>${atracoesLista}</ul>
        <h2>${t.atracoesCriancas}</h2>
        <h3>${t.faixa2a5}</h3><ul>${listaSimples(dados.atracoesCriancas?.["2a5"])}</ul>
        <h3>${t.faixa5a8}</h3><ul>${listaSimples(dados.atracoesCriancas?.["5a8"])}</ul>
        <h3>${t.faixa8a12}</h3><ul>${listaSimples(dados.atracoesCriancas?.["8a12"])}</ul>
      </body></html>`;
}

export default function ResultsScreen({ route, navigation }) {
  const { dadosPreCarregados, contexto } = route.params || {};
  const idioma = contexto?.idioma || "pt";
  const t = idiomas[idioma];

  const [dados, setDados] = useState(dadosPreCarregados || null);
  const [carregando, setCarregando] = useState(!dadosPreCarregados);
  const [erro, setErro] = useState(null);
  const [favorito, setFavorito] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  useEffect(() => {
    async function carregarDados() {
      if (dadosPreCarregados) {
        const jaFavorito = await ehFavorito(contexto);
        setFavorito(jaFavorito);
        return;
      }
      try {
        setCarregando(true);
        const res = await buscarInformacoesDestino(contexto);
        setDados(res);
        await salvarNoHistorico(contexto, res);
        const jaFavorito = await ehFavorito(contexto);
        setFavorito(jaFavorito);
      } catch (e) {
        if (e.message === "SEM_LOGIN") setErro(t.erroSemLogin);
        else if (e.message === "LIMITE_ATINGIDO") setErro(t.erroLimiteAtingido);
        else if (e.message === "EMAIL_NAO_VERIFICADO") setErro(t.erroEmailNaoVerificado);
        else setErro(e.message === "SEM_CHAVE" ? t.erroSemChave : t.erroGenerico);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
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
      if (podeCompartilhar) await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
    } catch (e) {
      setErro(t.erroGenerico);
    } finally {
      setGerandoPdf(false);
    }
  }

  function handleAbrirHoteis() {
    Linking.openURL(gerarLinkHotelAfiliado(contexto));
  }

  if (carregando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.textoCarregando}>{t.buscandoInfo}</Text>
      </View>
    );
  }

  if (erro || !dados) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.textoErro}>{erro || t.erroGenerico}</Text>
        <TouchableOpacity style={styles.botaoVoltar} onPress={() => navigation.goBack()}>
          <Text style={styles.textoBotaoVoltar}>{t.novaBusca}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cidadeNome = contexto?.cidade;
  const atracoesSaoObjetos = Array.isArray(dados.principaisAtracoes) && typeof dados.principaisAtracoes[0] === "object";
  const temMaxMin = dados.temperaturaMaximaEpoca || dados.temperaturaMinimaEpoca;

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.containerImagem}>
          {dados.fotoUrl ? <Image source={{ uri: dados.fotoUrl }} style={styles.imagemDestino} resizeMode="cover" /> : null}
          <TouchableOpacity style={styles.botaoVoltarTopo} onPress={() => navigation.goBack()}>
            <Text style={styles.textoVoltarTopo}>← {t.voltar}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoFavoritoTopo} onPress={handleFavoritar}>
            <Text style={styles.iconeFavorito}>{favorito ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.conteudo}>
          <Text style={styles.tituloDestino}>{dados.destino}</Text>
          {dados.boasVindas ? <Text style={styles.boasVindas}>{dados.boasVindas}</Text> : null}

          <CardCompartilhavelImagem dados={dados} contexto={contexto} t={t} />

          <View style={styles.gridInfo}>
            <CardInfo label={`🌤️ ${t.melhorEpoca}`} valor={dados.melhorEpoca} />
            <CardInfo label={`🌡️ ${t.tempMediaAno}`} valor={dados.temperaturaMediaAno} />
            <CardInfo
              label={`🌡️ ${t.tempMediaEpoca}`}
              valor={temMaxMin ? `${dados.temperaturaMediaEpoca}  (${t.maxMinEpoca}: ${dados.temperaturaMaximaEpoca || "-"} / ${dados.temperaturaMinimaEpoca || "-"})` : dados.temperaturaMediaEpoca}
            />
            {dados.moedaDestino && (
              <CardInfo label={`💱 ${t.moedaLocal}`} valor={dados.cambio ? `${dados.moedaDestino} — ${dados.cambio}` : dados.moedaDestino} />
            )}
            <CardInfo label={`🛂 ${t.precisaVisto}`} valor={dados.precisaVisto} />
          </View>

          <View style={styles.secao}>
            <Text style={styles.tituloSecao}>💉 {t.vacinaObrigatoria}</Text>
            <Text style={styles.textoRegiao}>{dados.vacinaObrigatoria}</Text>
            <Text style={styles.avisoOficial}>{t.avisoVacina}</Text>
            <LinkConfirmarVacina destino={dados.destino} paisEmbarque={contexto?.paisEmbarque} texto={t.confirmarVacina} />
          </View>

          {dados.custoEstimadoUsd && (
            <View style={styles.secao}>
              <Text style={styles.tituloSecao}>💰 {t.custoEstimado}</Text>
              <Text style={styles.subTituloNivel}>{t.nivelMochileiro}</Text>
              <Text style={styles.textoRegiao}>
                US$ {dados.custoEstimadoUsd.mochileiro}{dados.custoEstimadoConvertido ? ` (≈ ${dados.moedaOrigemSimbolo} ${dados.custoEstimadoConvertido.mochileiro})` : ""}
              </Text>
              <Text style={styles.subTituloNivel}>{t.nivelRegular}</Text>
              <Text style={styles.textoRegiao}>
                US$ {dados.custoEstimadoUsd.regular}{dados.custoEstimadoConvertido ? ` (≈ ${dados.moedaOrigemSimbolo} ${dados.custoEstimadoConvertido.regular})` : ""}
              </Text>
              <Text style={styles.subTituloNivel}>{t.nivelPremium}</Text>
              <Text style={styles.textoRegiao}>
                US$ {dados.custoEstimadoUsd.premium}{dados.custoEstimadoConvertido ? ` (≈ ${dados.moedaOrigemSimbolo} ${dados.custoEstimadoConvertido.premium})` : ""}
              </Text>
              <Text style={styles.avisoOficial}>{t.avisoCusto}</Text>
            </View>
          )}

          <View style={styles.secao}>
            <Text style={styles.tituloSecao}>🏨 {t.melhorRegiao}</Text>
            <Text style={styles.textoRegiao}>{dados.melhorRegiao}</Text>
            <TouchableOpacity style={styles.botaoHotel} onPress={handleAbrirHoteis}>
              <Text style={styles.textoBotaoHotel}>{t.verPrecosReservar}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.secao}>
            <Text style={styles.tituloSecao}>⭐ {t.hoteisBemAvaliados}</Text>
            {dados.hoteisBemAvaliados?.map((h, i) => (
              <ItemLink key={i} nome={h.nome} detalhe={h.bairro} avaliacao={h.avaliacao} urlReal={h.mapsUrl} cidade={cidadeNome} />
            ))}
          </View>

          <View style={styles.secao}>
            <Text style={styles.tituloSecao}>💸 {t.hoteisCustoBeneficio}</Text>
            {dados.hoteisCustoBeneficio?.map((h, i) => (
              <ItemLink key={i} nome={h.nome} detalhe={h.bairro} avaliacao={h.avaliacao} urlReal={h.mapsUrl} cidade={cidadeNome} />
            ))}
          </View>

          {dados.hoteisRegiaoDesejada && (
            <View style={styles.secao}>
              <Text style={styles.tituloSecao}>🏨 {t.hoteisRegiao} ({contexto.regiaoDesejada})</Text>
              {dados.hoteisRegiaoDesejada.map((h, i) => (
                <ItemLink key={i} nome={h.nome} detalhe={h.bairro} avaliacao={h.avaliacao} urlReal={h.mapsUrl} cidade={cidadeNome} />
              ))}
            </View>
          )}

          {dados.restaurantesRegiaoDesejada && (
            <View style={styles.secao}>
              <Text style={styles.tituloSecao}>🍽️ {t.restaurantesRegiao} ({contexto.regiaoDesejada})</Text>
              {dados.restaurantesRegiaoDesejada.map((r, i) => (
                <ItemLink key={i} nome={r.nome} detalhe={r.tipoCozinha} cidade={cidadeNome} />
              ))}
            </View>
          )}

          <View style={styles.secao}>
            <Text style={styles.tituloSecao}>✈️ {t.distanciaAeroporto}</Text>
            {dados.distanciaAeroporto?.map((a, i) => (
              <ItemLink key={i} nome={a.aeroporto} detalhe={a.distanciaKm} cidade={cidadeNome} />
            ))}
          </View>

          <View style={styles.secao}>
            <Text style={styles.tituloSecao}>📍 {t.principaisAtracoes}</Text>
            {atracoesSaoObjetos
              ? dados.principaisAtracoes.map((a, i) => (
                  <ItemLink key={i} nome={a.nome} detalhe={a.bairro} avaliacao={a.avaliacao} urlReal={a.mapsUrl} cidade={cidadeNome} />
                ))
              : dados.principaisAtracoes?.map((a, i) => <ItemLink key={i} nome={a} cidade={cidadeNome} />)}
          </View>

          <View style={styles.secao}>
            <Text style={styles.tituloSecao}>🧒 {t.atracoesCriancas}</Text>
            <Text style={styles.subTituloNivel}>{t.faixa2a5}</Text>
            {dados.atracoesCriancas?.["2a5"]?.map((a, i) => <ItemLink key={i} nome={a} cidade={cidadeNome} />)}
            <Text style={styles.subTituloNivel}>{t.faixa5a8}</Text>
            {dados.atracoesCriancas?.["5a8"]?.map((a, i) => <ItemLink key={i} nome={a} cidade={cidadeNome} />)}
            <Text style={styles.subTituloNivel}>{t.faixa8a12}</Text>
            {dados.atracoesCriancas?.["8a12"]?.map((a, i) => <ItemLink key={i} nome={a} cidade={cidadeNome} />)}
          </View>

          <TouchableOpacity style={styles.botaoPdf} onPress={handleBaixarPdf} disabled={gerandoPdf}>
            {gerandoPdf ? <ActivityIndicator color="#38bdf8" /> : <Text style={styles.textoBotaoPdf}>{t.baixarPdf}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.botaoVoltar} onPress={() => navigation.popToTop()}>
            <Text style={styles.textoBotaoVoltar}>{t.novaBusca}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  centerContainer: { flex: 1, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center", padding: 20 },
  textoCarregando: { color: "#cbd5e1", marginTop: 12, fontSize: 14 },
  textoErro: { color: "#f87171", fontSize: 14, textAlign: "center", marginBottom: 16 },
  botaoVoltar: { backgroundColor: "#1e293b", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 12, marginBottom: 20 },
  textoBotaoVoltar: { color: "#ffffff", fontWeight: "bold" },
  containerImagem: { width: "100%", height: 220, backgroundColor: "#1e293b", position: "relative" },
  imagemDestino: { width: "100%", height: "100%" },
  botaoVoltarTopo: { position: "absolute", top: 40, left: 16, backgroundColor: "rgba(15,23,42,0.8)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  textoVoltarTopo: { color: "#ffffff", fontWeight: "bold", fontSize: 13 },
  botaoFavoritoTopo: { position: "absolute", top: 40, right: 16, backgroundColor: "rgba(15,23,42,0.8)", padding: 8, borderRadius: 20 },
  iconeFavorito: { fontSize: 18 },
  conteudo: { padding: 20 },
  tituloDestino: { fontSize: 26, fontWeight: "bold", color: "#ffffff", marginBottom: 4 },
  boasVindas: { fontSize: 14, color: "#94a3b8", fontStyle: "italic", marginBottom: 20 },

  // --- Bloco do card compartilhável ---
  blocoCompartilhar: { marginBottom: 24 },
  tituloBlocoCompartilhar: { color: "#38bdf8", fontSize: 13, fontWeight: "700", marginBottom: 10 },
  linhaFormato: { flexDirection: "row", gap: 10, marginBottom: 14 },
  botaoFormato: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155" },
  botaoFormatoAtivo: { backgroundColor: "#eab654", borderColor: "#eab654" },
  textoBotaoFormato: { color: "#94a3b8", fontWeight: "700", fontSize: 13 },
  textoBotaoFormatoAtivo: { color: "#0f172a" },

  cartaoImagem: { width: "100%", borderRadius: 20, overflow: "hidden", backgroundColor: "#0b1f3a" },
  circuloDecorativo: { position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: 999, backgroundColor: "rgba(109,140,255,0.18)" },
  ondaDecorativa: { position: "absolute", bottom: -60, left: -40, width: "160%", height: 160, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.04)", transform: [{ rotate: "-6deg" }] },
  conteudoCartao: { flex: 1, padding: 24, justifyContent: "space-between" },
  tituloCartao: {
    fontSize: 34,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#f8fafc",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
    lineHeight: 40,
  },
  subtituloCartao: {
    fontSize: 15,
    fontStyle: "italic",
    color: "#93a5d1",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
    marginTop: 10,
    lineHeight: 21,
  },
  fotoCartao: { width: "100%", height: 150, borderRadius: 14, marginTop: 18 },
  rodapeCartao: { marginTop: "auto" },
  linhaSeparadora: { height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginBottom: 14 },
  linhaInfoCartao: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  iconeInfoCartao: { fontSize: 16 },
  textoInfoCartao: { color: "#e2e8f0", fontSize: 14 },
  marcaCartao: { marginTop: 8 },
  textoMarcaCartao: { color: "#64748b", fontSize: 11, fontWeight: "600" },

  botaoCompartilharImagem: { backgroundColor: "#38bdf8", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  textoBotaoCompartilharImagem: { color: "#0f172a", fontSize: 15, fontWeight: "700" },

  gridInfo: { gap: 12, marginBottom: 20 },
  cardInfo: { backgroundColor: "#1e293b", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#334155" },
  labelCard: { color: "#38bdf8", fontSize: 12, fontWeight: "bold", marginBottom: 4 },
  valorCard: { color: "#f8fafc", fontSize: 13 },
  secao: { marginTop: 16, backgroundColor: "#1e293b", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#334155" },
  tituloSecao: { color: "#ffffff", fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  subTituloNivel: { color: "#94a3b8", fontSize: 12, fontWeight: "700", marginTop: 8, marginBottom: 2, textTransform: "uppercase" },
  textoRegiao: { color: "#cbd5e1", fontSize: 13, marginBottom: 4 },
  avisoOficial: { color: "#64748b", fontSize: 11, fontStyle: "italic", marginTop: 6, lineHeight: 15 },
  linkConfirmar: { color: "#38bdf8", fontSize: 13, fontWeight: "600", marginTop: 8, textDecorationLine: "underline" },
  botaoHotel: { backgroundColor: "#22c55e", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 12 },
  textoBotaoHotel: { color: "#0f172a", fontWeight: "bold", fontSize: 14 },
  itemAtracao: { marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#334155", paddingBottom: 8 },
  nomeAtracao: { color: "#38bdf8", fontWeight: "bold", fontSize: 14, textDecorationLine: "underline" },
  detalheAtracao: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  botaoPdf: { borderColor: "#38bdf8", borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  textoBotaoPdf: { color: "#38bdf8", fontSize: 16, fontWeight: "600" },
});