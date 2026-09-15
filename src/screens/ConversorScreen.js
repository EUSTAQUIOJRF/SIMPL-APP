import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { idiomas } from "../i18n/translations";
import { buscarCotacoes } from "../services/travelApi";

const MOEDAS_ALVO = [
  { codigo: "BRL", nome: "Real brasileiro" },
  { codigo: "ARS", nome: "Peso argentino" },
  { codigo: "CAD", nome: "Dólar canadense" },
  { codigo: "AUD", nome: "Dólar australiano" },
  { codigo: "CNY", nome: "Yuan chinês" },
  { codigo: "CHF", nome: "Franco suíço" },
  { codigo: "JPY", nome: "Iene japonês" },
  { codigo: "COP", nome: "Peso colombiano" },
  { codigo: "EGP", nome: "Libra egípcia" },
  { codigo: "MXN", nome: "Peso mexicano" },
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
    <View style={styles.container}>
      <Text style={styles.titulo}>{t.conversorTitulo}</Text>

      <Text style={styles.label}>{t.labelValorUsd}</Text>
      <View style={styles.inputContainer}>
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
              <View>
                <Text style={styles.itemCodigo}>{m.codigo}</Text>
                <Text style={styles.itemNome}>{m.nome}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", paddingTop: 60, paddingHorizontal: 20 },
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
  prefixo: { color: "#38bdf8", fontSize: 18, fontWeight: "700", marginRight: 8 },
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
    marginBottom: 20,
  },
  botaoVoltarTexto: { color: "#94a3b8", fontSize: 15, fontWeight: "600" },
});