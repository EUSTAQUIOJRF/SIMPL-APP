import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from "react-native";
import { idiomas } from "../i18n/translations";
import { buscarCotacoes } from "../services/travelApi";

const MOEDAS_ALVO = [
  { codigo: "BRL", nome: "Real brasileiro", pais: "br" },
  { codigo: "EUR", nome: "Euro", pais: "eu" },
  { codigo: "GBP", nome: "Libra esterlina", pais: "gb" },
  { codigo: "ARS", nome: "Peso argentino", pais: "ar" },
  { codigo: "CAD", nome: "Dólar canadense", pais: "ca" },
  { codigo: "AUD", nome: "Dólar australiano", pais: "au" },
  { codigo: "CNY", nome: "Yuan chinês", pais: "cn" },
  { codigo: "CHF", nome: "Franco suíço", pais: "ch" },
  { codigo: "JPY", nome: "Iene japonês", pais: "jp" },
  { codigo: "COP", nome: "Peso colombiano", pais: "co" },
  { codigo: "EGP", nome: "Libra egípcia", pais: "eg" },
  { codigo: "MXN", nome: "Peso mexicano", pais: "mx" },
];

export default function ConversorScreen({ route, navigation }) {
  const idioma = route.params?.idioma || "pt";
  const t = idiomas[idioma];

  const [valorUsd, setValorUsd] = useState("100");
  const [cotacoes, setCotacoes] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarCotacoes().then((dados) => {
      setCotacoes(dados);
      setCarregando(false);
    });
  }, []);

  const valorNumerico = parseFloat(valorUsd.replace(",", ".")) || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.titulo}>{t.conversorTitulo}</Text>

      <Text style={styles.label}>{t.labelValorUsd}</Text>
      <View style={styles.inputContainer}>
        <Image
          source={{ uri: "https://flagcdn.com/w40/us.png" }}
          style={styles.bandeiraUsd}
        />
        <Text style={styles.prefixo}>US$</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={valorUsd}
          onChangeText={setValorUsd}
          placeholderTextColor="#999"
        />
      </View>

      {carregando ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 30 }} />
      ) : cotacoes ? (
        <View style={styles.lista}>
          {MOEDAS_ALVO.map((m) => (
            <View key={m.codigo} style={styles.item}>
              <View style={styles.itemEsquerda}>
                <Image
                  source={{ uri: `https://flagcdn.com/w40/${m.pais}.png` }}
                  style={styles.itemBandeiraImagem}
                />
                <View>
                  <Text style={styles.itemCodigo}>{m.codigo}</Text>
                  <Text style={styles.itemNome}>{m.nome}</Text>
                </View>
              </View>
              <Text style={styles.itemValor}>
                {(valorNumerico * (cotacoes[m.codigo] || 0)).toLocaleString(idioma, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.erro}>{t.erroGenerico}</Text>
      )}

      <TouchableOpacity style={styles.botaoVoltar} onPress={() => navigation.goBack()}>
        <Text style={styles.botaoVoltarTexto}>{t.voltar}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  conteudo: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40 },
  titulo: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 24, textAlign: "center" },
  label: { color: "#94a3b8", fontSize: 13, marginBottom: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  bandeiraUsd: { width: 22, height: 15, borderRadius: 2, marginRight: 8 },
  prefixo: { color: "#38bdf8", fontSize: 16, fontWeight: "700", marginRight: 8 },
  input: { flex: 1, color: "#fff", fontSize: 18, paddingVertical: 12 },
  lista: { gap: 10 },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 14,
  },
  itemEsquerda: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemBandeiraImagem: { width: 24, height: 16, borderRadius: 2 },
  itemCodigo: { color: "#fff", fontSize: 15, fontWeight: "700" },
  itemNome: { color: "#64748b", fontSize: 12, marginTop: 2 },
  itemValor: { color: "#4ade80", fontSize: 17, fontWeight: "700" },
  erro: { color: "#f87171", textAlign: "center", marginTop: 30 },
  botaoVoltar: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  botaoVoltarTexto: { color: "#94a3b8", fontSize: 15, fontWeight: "600" },
});