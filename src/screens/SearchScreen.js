import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
  Animated,
  Easing,
  RefreshControl,
} from "react-native";
import {
  verificarCidadesHomonimas,
  escolherDestinoSurpresa,
  buscarDestinosPorOrcamento,
  buscarCotacoes,
  buscarNoticiasViagem,
  buscarDicaDoAdmin,
  buscarTaxaCambioPais,
} from "../services/travelApi";
import { sair } from "../authApi";
import { idiomas } from "../i18n/translations";

const MOEDAS_LETREIRO = [
  { codigo: "BRL", bandeira: "🇧🇷", simbolo: "R$" },
  { codigo: "GBP", bandeira: "🇬🇧", simbolo: "£" },
  { codigo: "EUR", bandeira: "🇪🇺", simbolo: "€" },
  { codigo: "ARS", bandeira: "🇦🇷", simbolo: "AR$" },
  { codigo: "CAD", bandeira: "🇨🇦", simbolo: "CAD$" },
  { codigo: "AUD", bandeira: "🇦🇺", simbolo: "AUD$" },
  { codigo: "CNY", bandeira: "🇨🇳", simbolo: "¥" },
  { codigo: "CHF", bandeira: "🇨🇭", simbolo: "CHF" },
  { codigo: "JPY", bandeira: "🇯🇵", simbolo: "¥" },
  { codigo: "COP", bandeira: "🇨🇴", simbolo: "COL$" },
  { codigo: "EGP", bandeira: "🇪🇬", simbolo: "E£" },
  { codigo: "MXN", bandeira: "🇲🇽", simbolo: "MX$" },
];

const PIXELS_POR_SEGUNDO = 45;

function LetreiroCotacoes({ cotacoes, onPress }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [largura, setLargura] = useState(0);
  const medidaFeitaRef = useRef(false);

  useEffect(() => {
    if (largura === 0) return;
    translateX.setValue(0);
    const duracao = (largura / PIXELS_POR_SEGUNDO) * 1000;
    const loopAnim = Animated.loop(
      Animated.timing(translateX, {
        toValue: -largura,
        duration: duracao,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loopAnim.start();
    return () => loopAnim.stop();
  }, [largura]);

  function medirLargura(e) {
    if (medidaFeitaRef.current) return;
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      medidaFeitaRef.current = true;
      setLargura(w);
    }
  }

  function ItemMoeda({ item }) {
    return (
      <View style={styles.itemCotacaoBarra}>
        <Text style={styles.bandeiraBarra}>{item.bandeira}</Text>
        <Text style={styles.textoCotacaoBarra}>
          {item.simbolo} {cotacoes[item.codigo]?.toFixed(2)}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.containerBarraCotacoes}>
      <View style={styles.badgeBaseUsd}>
        <Text style={styles.textUsdBase}>🇺🇸 US$ 1,00</Text>
      </View>
      <View style={styles.faixaRolagem}>
        {/* Cópia invisível, só existe pra medir a largura exata de UM conjunto completo */}
        <View
          style={{ position: "absolute", opacity: 0, flexDirection: "row" }}
          onLayout={medirLargura}
          pointerEvents="none"
        >
          {MOEDAS_LETREIRO.map((item, i) => (
            <ItemMoeda key={i} item={item} />
          ))}
        </View>

        {largura > 0 && (
          <Animated.View style={{ flexDirection: "row", transform: [{ translateX }] }}>
            {[...MOEDAS_LETREIRO, ...MOEDAS_LETREIRO, ...MOEDAS_LETREIRO].map((item, i) => (
              <ItemMoeda key={i} item={item} />
            ))}
          </Animated.View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const PERFIS_SURPRESA = [
  "Praia e Sol", "Montanha e Frio", "Cultura e História", "Gastronomia",
  "Aventura e Natureza", "Ecoturismo", "Vida Noturna", "Compras", "Romântico", "Família",
];

export default function SearchScreen({ navigation }) {
  const [idioma, setIdioma] = useState("pt");
  const t = idiomas[idioma];

  const [cidade, setCidade] = useState("");
  const [paisEmbarque, setPaisEmbarque] = useState("Brasil");
  const [dataIda, setDataIda] = useState("");
  const [dataVolta, setDataVolta] = useState("");
  const [pessoas, setPessoas] = useState("");
  const [regiaoDesejada, setRegiaoDesejada] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const [dicaDoDia, setDicaDoDia] = useState("");
  const [noticias, setNoticias] = useState([]);
  const [carregandoNoticias, setCarregandoNoticias] = useState(true);
  const [cotacoes, setCotacoes] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [modalSurpresaVisivel, setModalSurpresaVisivel] = useState(false);
  const [perfisSelecionados, setPerfisSelecionados] = useState([]);

  const [modalOrcamentoVisivel, setModalOrcamentoVisivel] = useState(false);
  const [valorUsd, setValorUsd] = useState("");
  const [mesViagem, setMesViagem] = useState("Janeiro");
  const [paisEmbarqueOrcamento, setPaisEmbarqueOrcamento] = useState("Brasil");
  const [carregandoOrcamento, setCarregandoOrcamento] = useState(false);
  const [resultadoOrcamento, setResultadoOrcamento] = useState(null);
  const [taxaOrcamento, setTaxaOrcamento] = useState(null);

  useEffect(() => {
    carregarDadosIniciais();
  }, [idioma]);

  useEffect(() => {
    if (!modalOrcamentoVisivel || !paisEmbarqueOrcamento.trim()) return;
    buscarTaxaCambioPais(paisEmbarqueOrcamento.trim()).then(setTaxaOrcamento);
  }, [paisEmbarqueOrcamento, modalOrcamentoVisivel]);

  async function carregarDadosIniciais() {
    buscarCotacoes().then((dados) => dados && setCotacoes(dados));
    setCarregandoNoticias(true);
    try {
      const [dica, listaNoticias] = await Promise.all([
        buscarDicaDoAdmin(),
        buscarNoticiasViagem(idioma),
      ]);
      setDicaDoDia(dica);
      setNoticias(listaNoticias);
    } finally {
      setCarregandoNoticias(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await carregarDadosIniciais();
    setRefreshing(false);
  }

  async function handleSair() {
    await sair();
    navigation.replace("Login");
  }

  function tratarErroBusca(e) {
    if (e.message === "SEM_LOGIN") return t.erroSemLogin;
    if (e.message === "LIMITE_ATINGIDO") return t.erroLimiteAtingido;
    if (e.message === "EMAIL_NAO_VERIFICADO") return t.erroEmailNaoVerificado;
    return e.message === "SEM_CHAVE" ? t.erroSemChave : t.erroGenerico;
  }

  async function handleBuscar() {
    if (!cidade.trim()) {
      Alert.alert(t.atencao, t.digiteCidade);
      return;
    }
    if (!dataIda.trim()) {
      Alert.alert(t.atencao, t.erroDataObrigatoria);
      return;
    }
    if (!paisEmbarque.trim()) {
      Alert.alert(t.atencao, t.erroPaisEmbarqueObrigatorio);
      return;
    }

    setCarregando(true);
    setErro(null);

    const contexto = {
      cidade: cidade.trim(),
      pais: "",
      paisEmbarque: paisEmbarque.trim(),
      dataIda,
      dataVolta,
      pessoas,
      regiaoDesejada: regiaoDesejada.trim(),
      idioma,
    };

    try {
      const checagem = await verificarCidadesHomonimas(cidade.trim(), "");

      if (checagem.ambiguo && checagem.opcoes?.length > 0) {
        navigation.navigate("Desambiguacao", { opcoes: checagem.opcoes, contexto, idioma });
      } else {
        const contextoCorrigido = {
          ...contexto,
          cidade: checagem.cidade || contexto.cidade,
          pais: checagem.pais || contexto.pais,
        };
        navigation.navigate("Resultados", { contexto: contextoCorrigido });
      }
    } catch (e) {
      Alert.alert(t.erroTitulo, tratarErroBusca(e));
    } finally {
      setCarregando(false);
    }
  }

  function togglePerfil(perfil) {
    setPerfisSelecionados((prev) =>
      prev.includes(perfil) ? prev.filter((p) => p !== perfil) : [...prev, perfil]
    );
  }

  async function handleGerarSurpresa() {
    setModalSurpresaVisivel(false);
    setCarregando(true);
    try {
      const escolha = await escolherDestinoSurpresa(perfisSelecionados, paisEmbarque, idioma);
      const contexto = {
        cidade: escolha.cidade,
        pais: escolha.pais,
        paisEmbarque: paisEmbarque.trim() || "Brasil",
        dataIda,
        dataVolta,
        pessoas,
        regiaoDesejada: "",
        idioma,
      };
      navigation.navigate("Resultados", { contexto });
    } catch (e) {
      Alert.alert(t.erroTitulo, tratarErroBusca(e));
    } finally {
      setCarregando(false);
      setPerfisSelecionados([]);
    }
  }

  async function handleBuscarPorOrcamento() {
    if (!valorUsd || isNaN(valorUsd)) {
      Alert.alert(t.atencao, t.valorInvalido);
      return;
    }
    setCarregandoOrcamento(true);
    try {
      const res = await buscarDestinosPorOrcamento({
        valorDisponivelUsd: parseFloat(valorUsd),
        mes: mesViagem,
        paisEmbarque: paisEmbarqueOrcamento,
      });
      setResultadoOrcamento(res);
    } catch (e) {
      Alert.alert(t.erroTitulo, tratarErroBusca(e));
    } finally {
      setCarregandoOrcamento(false);
    }
  }

  function abrirResultadoOrcamento(item) {
    setModalOrcamentoVisivel(false);
    setResultadoOrcamento(null);
    navigation.navigate("Resultados", {
      contexto: { cidade: item.cidade, pais: item.pais, paisEmbarque: paisEmbarqueOrcamento, idioma 
},
    });
  }

  const valorConvertido =
    valorUsd && !isNaN(valorUsd) && taxaOrcamento
      ? (parseFloat(valorUsd) * taxaOrcamento.taxaUsd).toLocaleString("pt-BR", { 
minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0f172a" }} behavior={Platform.OS === 
"ios" ? "padding" : "height"}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} 
tintColor="#38bdf8" colors={["#38bdf8"]} />}
      >
        <View style={styles.header}>
          <View style={styles.headerEsquerda}>
            <TouchableOpacity style={styles.botaoSair} onPress={handleSair}>
              <Text style={styles.botaoSairTexto}>{t.sair}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { marginLeft: 8 }]} onPress={() => 
navigation.navigate("Historico", { idioma })}>
              <Text style={styles.iconText}>⭐</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.seletorIdiomas}>
            {["pt", "en", "es"].map((cod) => (
              <TouchableOpacity key={cod} style={[styles.btnBandeira, idioma === cod && 
styles.btnBandeiraAtivo]} onPress={() => setIdioma(cod)}>
                <Text style={styles.textoBandeira}>{{ pt: "🇧🇷", en: "🇺🇸", es: "🇪🇸" 
}[cod]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Image source={require("../../logosemfundo2.png")} style={styles.logoImage} 
resizeMode="contain" />

        <Text style={styles.titulo}>{t.titulo}</Text>
        <Text style={styles.subtitulo}>{t.subtitulo}</Text>

        <View style={styles.containerBotoesTopo}>
          <TouchableOpacity style={styles.botaoSurpresa} onPress={() => 
setModalSurpresaVisivel(true)}>
            <Text style={styles.botaoSurpresaTexto}>{t.btnSurpresa}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoOrcamento} onPress={() => 
setModalOrcamentoVisivel(true)}>
            <Text style={styles.botaoOrcamentoTexto}>{t.btnOrcamento}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t.labelCidade}</Text>
          <TextInput style={styles.input} placeholder={t.placeholderCidade} 
placeholderTextColor="#64748b" value={cidade} onChangeText={setCidade} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t.labelPaisEmbarque} <Text 
style={styles.obrigatorio}>*</Text></Text>
          <TextInput style={styles.input} placeholder={t.placeholderPaisEmbarque} 
placeholderTextColor="#64748b" value={paisEmbarque} onChangeText={setPaisEmbarque} />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>{t.labelDataIda} <Text 
style={styles.obrigatorio}>*</Text></Text>
            <TextInput style={styles.input} placeholder="DD/MM/AAAA" placeholderTextColor="#64748b" 
value={dataIda} onChangeText={setDataIda} />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>{t.labelDataVolta}</Text>
            <TextInput style={styles.input} placeholder="DD/MM/AAAA" placeholderTextColor="#64748b" 
value={dataVolta} onChangeText={setDataVolta} />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t.labelPessoas}</Text>
          <TextInput style={styles.input} keyboardType="numeric" placeholder="2" 
placeholderTextColor="#64748b" value={pessoas} onChangeText={setPessoas} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t.labelRegiaoDesejada}</Text>
          <TextInput style={styles.input} placeholder={t.placeholderRegiaoDesejada} 
placeholderTextColor="#64748b" value={regiaoDesejada} onChangeText={setRegiaoDesejada} />
        </View>

        <TouchableOpacity style={styles.botaoBuscar} onPress={handleBuscar} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#ffffff" /> : <Text 
style={styles.textoBotaoBuscar}>{t.botaoBuscar}</Text>}
        </TouchableOpacity>

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <View style={styles.secaoParcerias}>
          <Text style={styles.tituloSecaoParcerias}>{t.tituloParcerias}</Text>
          <View style={styles.gridParcerias}>
            <TouchableOpacity style={styles.cardParceria} onPress={() => 
Linking.openURL("https://ektatraveling.tpx.gr/OeHONXnD")}>
              <Text style={styles.iconeParceria}>🛡️</Text>
              <Text style={styles.tituloParceria}>{t.seguro}</Text>
              <Text style={styles.subtituloParceria}>Ekta Insure</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cardParceria} onPress={() => 
Linking.openURL("https://airalo.tpx.gr/vSwWU9MG")}>
              <Text style={styles.iconeParceria}>📶</Text>
              <Text style={styles.tituloParceria}>{t.esim}</Text>
              <Text style={styles.subtituloParceria}>Airalo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cardParceria} onPress={() => 
Linking.openURL("https://kiwi.tpx.gr/dqV74yCf")}>
              <Text style={styles.iconeParceria}>✈️</Text>
              <Text style={styles.tituloParceria}>{t.passagens}</Text>
              <Text style={styles.subtituloParceria}>Kiwi.com</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cardParceria} onPress={() => 
Linking.openURL("https://klook.tpx.gr/c4GAtMTM")}>
              <Text style={styles.iconeParceria}>🎟️</Text>
              <Text style={styles.tituloParceria}>{t.passeios}</Text>
              <Text style={styles.subtituloParceria}>Klook</Text>
            </TouchableOpacity>
          </View>
        </View>

        {dicaDoDia ? (
          <View style={styles.cardDicaDia}>
            <Text style={styles.tituloDicaDia}>{t.dicaDia}</Text>
            <Text style={styles.textoDicaDia}>{dicaDoDia}</Text>
          </View>
        ) : null}

        <View style={styles.secaoNoticias}>
          <Text style={styles.tituloSecaoNoticias}>{t.noticiasTitulo}</Text>
          {carregandoNoticias ? (
            <ActivityIndicator color="#38bdf8" style={{ marginTop: 10 }} />
          ) : noticias.length > 0 ? (
            noticias.map((item, i) => (
              <TouchableOpacity key={i} style={styles.cardNoticia} onPress={() => item.link && 
Linking.openURL(item.link)}>
                <Text style={styles.tituloNoticia}>{item.titulo} ↗</Text>
                {item.fonte ? <Text style={styles.fonteNoticia}>{item.fonte}</Text> : null}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.textoSemNoticias}>{t.semNoticias}</Text>
          )}
        </View>

        {cotacoes && <LetreiroCotacoes cotacoes={cotacoes} onPress={() => 
navigation.navigate("Conversor", { idioma })} />}
      </ScrollView>

      <Modal visible={modalSurpresaVisivel} animationType="slide" transparent onRequestClose={() => 
setModalSurpresaVisivel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>{t.modalSurpresaTitulo}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <View style={styles.containerPerfis}>
                {PERFIS_SURPRESA.map((perfil) => {
                  const selecionado = perfisSelecionados.includes(perfil);
                  return (
                    <TouchableOpacity key={perfil} style={[styles.chipPerfil, selecionado && 
styles.chipPerfilSelecionado]} onPress={() => togglePerfil(perfil)}>
                      <Text style={[styles.textoChipPerfil, selecionado && 
styles.textoChipPerfilSelecionado]}>{perfil}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.botaoConfirmarModal, perfisSelecionados.length === 0 && { opacity: 0.5 
}]}
              disabled={perfisSelecionados.length === 0}
              onPress={handleGerarSurpresa}>
              <Text style={styles.textoConfirmarModal}>{t.btnSurpresaGerar}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaoFecharModal} onPress={() => 
setModalSurpresaVisivel(false)}>
              <Text style={styles.textoFecharModal}>{t.btnVoltaModal}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalOrcamentoVisivel} animationType="slide" transparent onRequestClose={() => 
setModalOrcamentoVisivel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.botaoFecharTopo} onPress={() => { 
setModalOrcamentoVisivel(false); setResultadoOrcamento(null); }}>
              <Text style={styles.textoFecharTopo}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitulo}>{t.modalOrcamentoTitulo}</Text>

            <Text style={styles.label}>{t.labelPaisEmbarque}</Text>
            <TextInput style={styles.input} placeholder="Brasil" placeholderTextColor="#64748b" 
value={paisEmbarqueOrcamento} onChangeText={setPaisEmbarqueOrcamento} />

            <Text style={[styles.label, { marginTop: 12 }]}>{t.valorUsdLabel}</Text>
            <View style={styles.linhaValorConversao}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                keyboardType="numeric"
                placeholder="1500"
                placeholderTextColor="#64748b"
                value={valorUsd}
                onChangeText={setValorUsd}
              />
              <View style={styles.campoConvertido}>
                <Text style={styles.labelConvertido}>{taxaOrcamento ? taxaOrcamento.codigo : 
"..."}</Text>
                <Text style={styles.valorConvertido}>
                  {valorConvertido ? `${taxaOrcamento.simbolo} ${valorConvertido}` : "—"}
                </Text>
              </View>
            </View>

            <Text style={styles.label}>{t.mesLabel}</Text>
            <TextInput style={styles.input} placeholder="Outubro" placeholderTextColor="#64748b" 
value={mesViagem} onChangeText={setMesViagem} />

            <TouchableOpacity style={styles.botaoBuscarOrcamento} onPress={handleBuscarPorOrcamento} 
disabled={carregandoOrcamento}>
              {carregandoOrcamento ? <ActivityIndicator color="#ffffff" /> : <Text 
style={styles.textoBotaoBuscar}>{t.btnBuscarOrcamento}</Text>}
            </TouchableOpacity>

            {resultadoOrcamento && (
              <ScrollView style={{ maxHeight: 200, marginTop: 12 }}>
                {resultadoOrcamento.destinos?.map((item, i) => (
                  <TouchableOpacity key={i} style={styles.cardDestino} onPress={() => 
abrirResultadoOrcamento(item)}>
                    <Text style={styles.nomeDestinoCard}>{item.cidade}, {item.pais}</Text>
                    <Text style={styles.detalheCusto}>Est. Total: US$ 
{item.custoTotalEstimadoUsd}</Text>
                    <Text style={styles.motivoCard}>{item.porQueEbom}</Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.avisoLegal}>⚠️ {resultadoOrcamento.avisoLegal}</Text>
              </ScrollView>
            )}

            <TouchableOpacity style={styles.botaoFecharModal} onPress={() => { 
setModalOrcamentoVisivel(false); setResultadoOrcamento(null); }}>
              <Text style={styles.textoFecharModal}>{t.btnVoltaModal}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: Platform.OS === "ios" ? 60 : 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", 
marginBottom: 8 },
  headerEsquerda: { flexDirection: "row", alignItems: "center" },
  botaoSair: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#1e293b", borderRadius: 
20, borderWidth: 1, borderColor: "#334155" },
  botaoSairTexto: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  seletorIdiomas: { flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", 
borderRadius: 16, paddingHorizontal: 4, paddingVertical: 2, borderWidth: 1, borderColor: "#334155" },
  btnBandeira: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 10 },
  btnBandeiraAtivo: { backgroundColor: "#334155" },
  textoBandeira: { fontSize: 14 },
  logoImage: { width: "78%", aspectRatio: 677 / 369, alignSelf: "center", marginBottom: 4 },
  iconButton: { padding: 8, backgroundColor: "#1e293b", borderRadius: 20, borderWidth: 1, 
borderColor: "#334155" },
  iconText: { fontSize: 15 },
  containerBarraCotacoes: { flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", 
borderRadius: 12, marginTop: 8, marginBottom: 20, paddingVertical: 8, borderWidth: 1, borderColor: 
"#334155", overflow: "hidden" },
  badgeBaseUsd: { backgroundColor: "#0f172a", paddingHorizontal: 10, paddingVertical: 6, 
borderRadius: 6, marginLeft: 8, marginRight: 8, borderWidth: 1, borderColor: "#38bdf8" },
  textUsdBase: { color: "#4ade80", fontSize: 12, fontWeight: "bold" },
  faixaRolagem: { flex: 1, overflow: "hidden" },
  itemCotacaoBarra: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f172a", 
paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8, borderWidth: 1, 
borderColor: "#334155" },
  bandeiraBarra: { fontSize: 15, marginRight: 6 },
  textoCotacaoBarra: { color: "#f8fafc", fontSize: 12, fontWeight: "600" },
  titulo: { fontSize: 24, fontWeight: "bold", color: "#ffffff", marginBottom: 4, textAlign: "center" 
},
  subtitulo: { fontSize: 13, color: "#94a3b8", marginBottom: 20, textAlign: "center" },
  containerBotoesTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", 
marginBottom: 20, gap: 10 },
  botaoSurpresa: { flex: 1, paddingVertical: 10, borderRadius: 20, backgroundColor: "#0a1120", 
borderColor: "#1e293b", borderWidth: 1, alignItems: "center" },
  botaoSurpresaTexto: { color: "#38bdf8", fontSize: 13, fontWeight: "700" },
  botaoOrcamento: { flex: 1, paddingVertical: 10, borderRadius: 20, backgroundColor: "#0a1120", 
borderColor: "#1e293b", borderWidth: 1, alignItems: "center" },
  botaoOrcamentoTexto: { color: "#4ade80", fontSize: 13, fontWeight: "700" },
  formGroup: { marginBottom: 14 },
  label: { color: "#cbd5e1", fontSize: 13, fontWeight: "600", marginBottom: 6 },
  obrigatorio: { color: "#f87171" },
  input: { backgroundColor: "#1e293b", color: "#ffffff", borderRadius: 8, paddingHorizontal: 12, 
paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: "#334155" },
  row: { flexDirection: "row" },
  linhaValorConversao: { flexDirection: "row", gap: 8, alignItems: "center" },
  campoConvertido: { backgroundColor: "#0f172a", borderRadius: 8, paddingHorizontal: 10, 
paddingVertical: 8, borderWidth: 1, borderColor: "#38bdf8", minWidth: 90, alignItems: "center" },
  labelConvertido: { color: "#38bdf8", fontSize: 10, fontWeight: "700" },
  valorConvertido: { color: "#4ade80", fontSize: 13, fontWeight: "700", marginTop: 2 },
  botaoBuscar: { backgroundColor: "#2563eb", paddingVertical: 14, borderRadius: 8, alignItems: 
"center", marginTop: 10 },
  erro: { color: "#f87171", marginTop: 12, textAlign: "center" },
  secaoParcerias: { marginTop: 20 },
  tituloSecaoParcerias: { color: "#ffffff", fontSize: 15, fontWeight: "bold", marginBottom: 10 },
  gridParcerias: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  cardParceria: { width: "48%", backgroundColor: "#1e293b", borderRadius: 10, padding: 12, 
alignItems: "center", borderWidth: 1, borderColor: "#334155", marginBottom: 8 },
  iconeParceria: { fontSize: 22, marginBottom: 4 },
  tituloParceria: { color: "#38bdf8", fontSize: 13, fontWeight: "bold", textAlign: "center" },
  subtituloParceria: { color: "#94a3b8", fontSize: 11, marginTop: 2, textAlign: "center" },
  botaoBuscarOrcamento: { backgroundColor: "#16a34a", paddingVertical: 12, borderRadius: 8, 
alignItems: "center", marginTop: 10 },
  textoBotaoBuscar: { color: "#ffffff", fontSize: 15, fontWeight: "bold" },
  cardDicaDia: { backgroundColor: "#1e293b", borderColor: "#0284c7", borderWidth: 1, borderRadius: 
12, padding: 14, marginTop: 20 },
  tituloDicaDia: { color: "#38bdf8", fontWeight: "bold", fontSize: 14, marginBottom: 4 },
  textoDicaDia: { color: "#cbd5e1", fontSize: 13, lineHeight: 18 },
  secaoNoticias: { marginTop: 24, marginBottom: 8 },
  tituloSecaoNoticias: { color: "#ffffff", fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  cardNoticia: { backgroundColor: "#1e293b", borderRadius: 10, padding: 12, marginBottom: 10, 
borderWidth: 1, borderColor: "#334155" },
  tituloNoticia: { color: "#38bdf8", fontWeight: "bold", fontSize: 13, marginBottom: 4 },
  fonteNoticia: { color: "#64748b", fontSize: 11 },
  textoSemNoticias: { color: "#64748b", fontSize: 12, fontStyle: "italic" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 
},
  modalContent: { backgroundColor: "#1e293b", borderRadius: 16, padding: 20, borderWidth: 1, 
borderColor: "#334155" },
  botaoFecharTopo: { alignSelf: "flex-end", padding: 4, marginBottom: 8 },
  textoFecharTopo: { color: "#94a3b8", fontSize: 13, fontWeight: "bold" },
  modalTitulo: { color: "#ffffff", fontSize: 18, fontWeight: "bold", marginBottom: 16, textAlign: 
"center" },
  containerPerfis: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipPerfil: { backgroundColor: "#0f172a", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 
16, borderWidth: 1, borderColor: "#334155" },
  chipPerfilSelecionado: { backgroundColor: "#2563eb", borderColor: "#3b82f6" },
  textoChipPerfil: { color: "#94a3b8", fontSize: 12 },
  textoChipPerfilSelecionado: { color: "#ffffff", fontWeight: "bold" },
  botaoConfirmarModal: { backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 8, 
alignItems: "center", marginTop: 16 },
  textoConfirmarModal: { color: "#ffffff", fontWeight: "bold" },
  botaoFecharModal: { marginTop: 14, alignItems: "center", paddingVertical: 10, backgroundColor: 
"#0f172a", borderRadius: 8, borderWidth: 1, borderColor: "#334155" },
  textoFecharModal: { color: "#cbd5e1", fontSize: 13, fontWeight: "600" },
  cardDestino: { backgroundColor: "#0f172a", padding: 12, borderRadius: 8, marginBottom: 8, 
borderWidth: 1, borderColor: "#334155" },
  nomeDestinoCard: { color: "#ffffff", fontWeight: "bold", fontSize: 14 },
  detalheCusto: { color: "#4ade80", fontSize: 12, marginVertical: 2 },
  motivoCard: { color: "#94a3b8", fontSize: 11 },
  avisoLegal: { color: "#94a3b8", fontSize: 11, fontStyle: "italic", marginTop: 8, textAlign: 
"center" },
});
