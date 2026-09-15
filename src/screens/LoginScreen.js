import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { registrar, entrar, traduzErroFirebase } from "../authApi";

export default function LoginScreen({ navigation }) {
  const [modo, setModo] = useState("entrar"); // "entrar" | "criar"
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  async function handleEnviar() {
    if (!email.trim() || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      if (modo === "entrar") {
        await entrar(email.trim(), senha);
      } else {
        await registrar(email.trim(), senha);
      }
      navigation.replace("Busca");
    } catch (e) {
      setErro(traduzErroFirebase(e.message));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Image
        source={require("../../logosemfundo2.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.titulo}>{modo === "entrar" ? "Entrar" : "Criar conta"}</Text>

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#999"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <TouchableOpacity style={styles.botao} onPress={handleEnviar} disabled={carregando}>
        {carregando ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.botaoTexto}>{modo === "entrar" ? "Entrar" : "Criar conta"}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setModo(modo === "entrar" ? "criar" : "entrar")}>
        <Text style={styles.link}>
          {modo === "entrar" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
        </Text>
      </TouchableOpacity>

      {erro && <Text style={styles.erro}>{erro}</Text>}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08192a", justifyContent: "center", padding: 24 },
  logo: { width: "60%", height: 120, alignSelf: "center", marginBottom: 8 },
  titulo: { fontSize: 24, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 24 },
  input: {
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  botao: {
    backgroundColor: "#38bdf8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  botaoTexto: { color: "#0f172a", fontSize: 16, fontWeight: "600" },
  link: { color: "#38bdf8", textAlign: "center", marginTop: 16, fontSize: 14 },
  erro: { color: "#f87171", marginTop: 16, textAlign: "center" },
});

