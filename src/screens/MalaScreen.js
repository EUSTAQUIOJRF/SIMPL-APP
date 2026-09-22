import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";

export default function MalaScreen({ route, navigation }) {
  const { cidade = "Destino", temperatura = 22 } = route.params || {};

  // Converte a temperatura recebida explicitamente para número
  const tempNumerica = Number(temperatura);

  const obterItensIniciais = (temp) => {
    const base = [
      { id: "1", nome: "Documentos e Passaporte", checado: false },
      { id: "2", nome: "Carregadores e Adaptador de Tomada", checado: false },
      { id: "3", nome: "Itens de Higiene Pessoal", checado: false },
      { id: "4", nome: "Medicamentos Básicos", checado: false },
    ];

    if (temp < 15) {
      // Clima Frio (< 15°C)
      return [
        ...base,
        { id: "5", nome: "Casaco Pesado / Sobretudo", checado: false },
        { id: "6", nome: "Luvas e Cachecol", checado: false },
        { id: "7", nome: "Calças Térmicas / Segunda Pele", checado: false },
        { id: "8", nome: "Sapatos Fechados / Botas", checado: false },
      ];
    } else {
      // Clima Quente / Ameno (>= 15°C)
      return [
        ...base,
        { id: "5", nome: "Protetor Solar e Óculos de Sol", checado: false },
        { id: "6", nome: "Roupas de Banho", checado: false },
        { id: "7", nome: "Camisetas Leves e Bermudas", checado: false },
        { id: "8", nome: "Chinelo / Sandália", checado: false },
      ];
    }
  };

  const [itens, setItens] = useState(obterItensIniciais(tempNumerica));

  const toggleItem = (id) => {
    setItens((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checado: !item.checado } : item
      )
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.cardItem, item.checado && styles.cardItemChecado]}
      onPress={() => toggleItem(item.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.checkbox}>{item.checado ? "☑️" : "🔲"}</Text>
      <Text style={[styles.textoItem, item.checado && styles.textoChecado]}>
        {item.nome}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.botaoVoltar}
        >
          <Text style={styles.textoVoltar}>➔</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Mala Inteligente</Text>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.cidadeTexto}>📍 {cidade}</Text>
        <Text style={styles.climaTexto}>
          {tempNumerica < 15 ? "❄️ Clima Frio" : "☀️ Clima Quente"} (~{tempNumerica}°C)
        </Text>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  botaoVoltar: { padding: 8, marginRight: 12 },
  textoVoltar: { color: "#38bdf8", fontSize: 20, transform: [{ rotate: "180deg" }] },
  titulo: { color: "#fff", fontSize: 20, fontWeight: "700" },
  subHeader: {
    backgroundColor: "#1e293b",
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cidadeTexto: { color: "#38bdf8", fontSize: 15, fontWeight: "600" },
  climaTexto: { color: "#94a3b8", fontSize: 13 },
  lista: { paddingHorizontal: 20, paddingBottom: 20 },
  cardItem: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  cardItemChecado: {
    backgroundColor: "#0f291e",
    borderColor: "#166534",
    opacity: 0.8,
  },
  checkbox: { fontSize: 18, marginRight: 12 },
  textoItem: { color: "#e2e8f0", fontSize: 15, flex: 1 },
  textoChecado: {
    color: "#86efac",
    textDecorationLine: "line-through",
  },
});
