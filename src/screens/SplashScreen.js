import React, { useRef, useEffect } from "react";
import { View, Image, StyleSheet, Animated } from "react-native";
import { obterSessaoSalva } from "../authApi";

export default function SplashScreen({ navigation }) {
  const opacidade = useRef(new Animated.Value(0)).current;
  const escala = useRef(new Animated.Value(0.4)).current;
  const sessaoRef = useRef(undefined);

  useEffect(() => {
    obterSessaoSalva().then((sessao) => {
      sessaoRef.current = sessao;
    });
  }, []);

  function iniciarAnimacao() {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacidade, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(escala, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1200),
      Animated.timing(opacidade, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.replace(sessaoRef.current ? "Busca" : "Login");
    });
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("../../fundo_azul_gradiente.png")}
        style={styles.fundo}
        resizeMode="cover"
      />
      <Animated.Image
        source={require("../../logosemfundo2.png")}
        style={[
          styles.logo,
          { opacity: opacidade, transform: [{ scale: escala }] },
        ]}
        resizeMode="contain"
        onLoadEnd={iniciarAnimacao}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08192a",
    justifyContent: "center",
    alignItems: "center",
  },
  fundo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  logo: {
    width: "75%",
    height: "55%",
  },
});

