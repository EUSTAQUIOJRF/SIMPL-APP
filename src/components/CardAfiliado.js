import React from "react";
import { TouchableOpacity, Text, StyleSheet, Linking, View } from "react-native";

export default function CardAfiliado({ titulo, descricao, icone, url }) {
  const abrirLink = () => {
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={abrirLink} activeOpacity={0.85}>
      <Text style={styles.icone}>{icone}</Text>
      <View style={styles.textoContainer}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.descricao}>{descricao}</Text>
      </View>
      <Text style={styles.seta}>➔</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  icone: {
    fontSize: 24,
    marginRight: 12,
  },
  textoContainer: {
    flex: 1,
  },
  titulo: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  descricao: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 16,
  },
  seta: {
    color: "#38bdf8",
    fontSize: 16,
    marginLeft: 8,
  },
});
