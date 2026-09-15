import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Linking,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { idiomas } from "../i18n/translations";
import { verificarCidadesHomonimas, buscarNoticiasViagem, buscarCotacoes, buscarDicaDoAdmin } from "../services/travelApi";
import { sair } from "../authApi";

const BANDEIRAS = { pt: "🇧🇷", en: "🇺🇸", es: "🇪🇸" };

const MOEDAS_LETREIRO = [
  { codigo: "USD", bandeira: "🇺🇸" },
  { codigo: "GBP", bandeira: "🇬🇧" },
  { codigo: "EUR", bandeira: "🇪🇺" },
  { codigo: "ARS", bandeira: "🇦🇷" },
  { codigo: "CAD", bandeira: "🇨🇦" },
  { codigo: "AUD", bandeira: "🇦🇺" },
  { codigo: "CNY", bandeira: "🇨🇳" },
  { codigo: "CHF", bandeira: "🇨🇭" },
  { codigo: "JPY", bandeira: "🇯🇵" },
  { codigo: "COP", bandeira: "🇨🇴" },
  { codigo: "EGP", bandeira: "🇪🇬" },
  { codigo: "MXN", bandeira: "🇲🇽" },
];

function LetreiroCotacoes({ cotacoes, onPress }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    if (largura === 0) return;
    translateX.setValue(0);
    Animated.loop(
      Animated.timing(translateX, {
        toValue: -largura,
        duration: largura * 22, // velocidade do letreiro
        useNativeDriver: true,
      })
    ).start();
  }, [largura]);

  function Item({ item }) {
    return (
      <View style={styles.itemLetreiro}>
        <Text style={styles.bandeiraLetreiro}>{item.bandeira}</Text>
        <Text style={styles.labelCotacao}>{item.codigo}</Text>
        <Text style={styles.valorCotacao}>R$ {(cotacoes.BRL / cotacoes[item.codigo]).toFixed(2)}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.barraCotacoes}>
      <View style={{ overflow: "hidden" }}>
        <Animated.View
          style={{ flexDirection: "row", transform: [{ translateX }] }}
          onLayout={(e) => {
            if (largura === 0) setLargura(e.nativeEvent.layout.width / 2);
          }}
        >
          {[...MOEDAS_LETREIRO, ...MOEDAS_LETREIRO].map((item, i) => (
            <Item key={i} item={item} />
          ))}
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen({ navigation }) {
  const [idioma, setIdioma] = useState("pt");
  const t = idiomas[idioma];

  const [cidade, setCidade] = useState("");
  const [pais, setPais] = useState("");
  const [paisEmbarque, setPaisEmbarque] = useState("");
  const [dataIda, setDataIda] = useState("");
  const [dataVolta, setDataVolta] = useState("");
  const [pessoas, setPessoas] = useState("");
  const [regiaoDesejada, setRegiaoDesejada] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [noticias, setNoticias] = useState([]);
  const [cotacoes, setCotacoes] = useState(null);
  const [dica, setDica] = useState("");

  useEffect(() => {
    buscarNoticiasViagem(idioma).then(setNoticias);
    buscarCotacoes().then(setCotacoes);
    buscarDicaDoAdmin().then(setDica);
  }, [idioma]);

  async function handleSair() {
    await sair();
    navigation.replace("Login");
  }

  async function handleBuscar() {
    if (!cidade.trim()) return;

    if (!dataIda.trim()) {
      setErro(t.erroDataObrigatoria);
      return;
    }

    if (!paisEmbarque.trim()) {
      setErro(t.erroPaisEmbarqueObrigatorio);
      return;
    }

    setCarregando(true);
    setErro(null);

    const contexto = {
      cidade: cidade.trim(),
      pais: pais.trim(),
      paisEmbarque: paisEmbarque.trim(),
      dataIda,
      dataVolta,
      pessoas,
      regiaoDesejada: regiaoDesejada.trim(),
      idioma,
    };

    try {
      const checagem = await verificarCidadesHomonimas(cidade.trim(), pais.trim());

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.seletorIdioma}>
        {Object.keys(idiomas).map((codigo) => (
          <TouchableOpacity
            key={codigo}
            style={[styles.bandeiraBotao, idioma === codigo && styles.bandeiraBotaoAtivo]}
            onPress={() => setIdioma(codigo)}
          >
            <Text style={styles.bandeiraTexto}>{BANDEIRAS[codigo]}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.botaoSair} onPress={handleSair}>
          <Text style={styles.botaoSairTexto}>{t.sair}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Image
          source={require("../../logosemfundo2.png")}
          style={styles.logoTopo}
          resizeMode="contain"
        />
        <Text style={styles.titulo}>{t.titulo}</Text>
        <Text style={styles.subtitulo}>{t.subtitulo}</Text>

        <TouchableOpacity
          style={styles.botaoHistorico}
          onPress={() => navigation.navigate("Historico", { idioma })}
        >
          <Text style={styles.botaoHistoricoTexto}>{t.verHistorico}</Text>
        </TouchableOpacity>

        {cotacoes && (
          <LetreiroCotacoes cotacoes={cotacoes} onPress={() => navigation.navigate("Conversor", { idioma })} />
        )}

        <Text style={styles.label}>{t.labelCidade}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.placeholderCidade}
          placeholderTextColor="#999"
          value={cidade}
          onChangeText={setCidade}
        />

        <Text style={styles.label}>
          {t.labelPaisEmbarque} <Text style={styles.obrigatorio}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t.placeholderPaisEmbarque}
          placeholderTextColor="#999"
          value={paisEmbarque}
          onChangeText={setPaisEmbarque}
        />

        <View style={styles.linha}>
          <View style={styles.metade}>
            <Text style={styles.label}>
              {t.labelDataIda} <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="dd/mm/aaaa"
              placeholderTextColor="#999"
              value={dataIda}
              onChangeText={setDataIda}
            />
          </View>
          <View style={styles.metade}>
            <Text style={styles.label}>{t.labelDataVolta}</Text>
            <TextInput
              style={styles.input}
              placeholder="dd/mm/aaaa"
              placeholderTextColor="#999"
              value={dataVolta}
              onChangeText={setDataVolta}
            />
          </View>
        </View>

        <Text style={styles.label}>{t.labelPessoas}</Text>
        <TextInput
          style={styles.input}
          placeholder="2"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={pessoas}
          onChangeText={setPessoas}
        />

        <Text style={styles.label}>{t.labelRegiaoDesejada}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.placeholderRegiaoDesejada}
          placeholderTextColor="#999"
          value={regiaoDesejada}
          onChangeText={setRegiaoDesejada}
        />

        <TouchableOpacity style={styles.botao} onPress={handleBuscar} disabled={carregando}>
          {carregando ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.botaoTexto}>{t.botaoBuscar}</Text>
          )}
        </TouchableOpacity>

        {erro && <Text style={styles.erro}>{erro}</Text>}

        {dica ? (
          <View style={styles.cardDica}>
            <Text style={styles.tituloDica}>{t.dicaDoDia}</Text>
            <Text style={styles.textoDica}>{dica}</Text>
          </View>
        ) : null}

        {noticias.length > 0 && (
          <View style={styles.secaoNoticias}>
            <Text style={styles.tituloNoticias}>{t.noticiasViagem}</Text>
            {noticias.map((n, i) => (
              <TouchableOpacity key={i} onPress={() => Linking.openURL(n.link)} style={styles.itemNoticia}>
                <Text style={styles.tituloNoticia}>{n.titulo}</Text>
                {n.fonte ? <Text style={styles.fonteNoticia}>{n.fonte}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  seletorIdioma: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 50,
    paddingRight: 20,
    gap: 8,
  },
  bandeiraBotao: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    opacity: 0.4,
  },
  bandeiraBotaoAtivo: { opacity: 1, backgroundColor: "#1e293b" },
  bandeiraTexto: { fontSize: 20 },
  botaoSair: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 4,
  },
  botaoSairTexto: { color: "#94a3b8", fontSize: 13, textDecorationLine: "underline" },
  scroll: { padding: 24, paddingTop: 4 },
  logoTopo: {
    width: "90%",
    height: 270,
    alignSelf: "center",
    marginBottom: 4,
  },
  titulo: { fontSize: 26, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 6, marginTop: -50 },
  subtitulo: { fontSize: 15, color: "#94a3b8", textAlign: "center", marginBottom: 16 },
  botaoHistorico: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1e293b",
    marginBottom: 20,
  },
  botaoHistoricoTexto: { color: "#38bdf8", fontSize: 13, fontWeight: "600" },
  barraCotacoes: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  itemLetreiro: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 6,
  },
  bandeiraLetreiro: { fontSize: 16 },
  labelCotacao: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  valorCotacao: { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },
  cardDica: {
    backgroundColor: "#1e3a2f",
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#22c55e",
  },
  tituloDica: { color: "#4ade80", fontSize: 12, fontWeight: "700", marginBottom: 6, textTransform: "uppercase" },
  textoDica: { color: "#e2e8f0", fontSize: 14, lineHeight: 20 },
  label: { color: "#94a3b8", fontSize: 13, marginBottom: 6, marginTop: 12 },
  obrigatorio: { color: "#f87171" },
  input: {
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  linha: { flexDirection: "row", gap: 12 },
  metade: { flex: 1 },
  botao: {
    backgroundColor: "#38bdf8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  botaoTexto: { color: "#0f172a", fontSize: 16, fontWeight: "600" },
  erro: { color: "#f87171", marginTop: 16, textAlign: "center" },
  secaoNoticias: { marginTop: 32, marginBottom: 20 },
  tituloNoticias: { color: "#38bdf8", fontSize: 13, fontWeight: "700", marginBottom: 10, textTransform: "uppercase" },
  itemNoticia: { backgroundColor: "#1e293b", borderRadius: 10, padding: 12, marginBottom: 8 },
  tituloNoticia: { color: "#e2e8f0", fontSize: 14, lineHeight: 19 },
  fonteNoticia: { color: "#64748b", fontSize: 11, marginTop: 4 },
});