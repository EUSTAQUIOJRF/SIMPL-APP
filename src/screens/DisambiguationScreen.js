import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { idiomas } from "../i18n/translations";

export default function DisambiguationScreen({ route, navigation }) {
  const { opcoes, contexto, idioma } = route.params;
  const t = idiomas[idioma];

  function escolher(opcao) {
    const novoContexto = { ...contexto, cidade: opcao.cidade, pais: opcao.pais };
    navigation.navigate("Resultados", { contexto: novoContexto });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{t.escolhaCidade}</Text>
      <FlatList
        data={opcoes}
        keyExtractor={(item, index) => `${item.cidade}-${index}`}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => escolher(item)}>
            <Text style={styles.itemCidade}>{item.cidade}</Text>
            <Text style={styles.itemDetalhe}>
              {item.regiaoOuEstado ? `${item.regiaoOuEstado}, ` : ""}
              {item.pais}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 24, paddingTop: 60 },
  titulo: { fontSize: 18, color: "#fff", marginBottom: 20, fontWeight: "600" },
  item: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
  },
  itemCidade: { color: "#fff", fontSize: 16, fontWeight: "600" },
  itemDetalhe: { color: "#94a3b8", fontSize: 13, marginTop: 4 },
});
