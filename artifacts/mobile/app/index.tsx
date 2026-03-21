import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import { AngelLogo } from "@/components/AngelLogo";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const logoAnim = useRef(new Animated.Value(1)).current;
  const textAnim = useRef(new Animated.Value(1)).current;
  const buttonsAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleContinue = (method: "google" | "email") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/home");
  };

  return (
    <LinearGradient
      colors={[Colors.primary, "#0D0520", "#1A0B2E"]}
      style={styles.container}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
    >
      {/* Background orbs */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoSection,
            {
              opacity: logoAnim,
              transform: [
                {
                  translateY: logoAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View style={[styles.glowRing, { opacity: glowAnim }]} />
          <View style={styles.iconContainer}>
            <AngelLogo size={100} />
          </View>
        </Animated.View>

        {/* Text */}
        <Animated.View
          style={[
            styles.textSection,
            {
              opacity: textAnim,
              transform: [
                {
                  translateY: textAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.appName}>Ángel Browser</Text>
          <Text style={styles.tagline}>Tu ángel guardián digital</Text>
          <Text style={styles.description}>
            Navega con inteligencia. Protegido en cada paso.
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View
          style={[
            styles.featuresRow,
            {
              opacity: textAnim,
            },
          ]}
        >
          {[
            { icon: "shield", label: "Análisis en tiempo real" },
            { icon: "users", label: "Red comunitaria" },
            { icon: "alert-triangle", label: "Alertas instantáneas" },
          ].map((feat) => (
            <View key={feat.icon} style={styles.featureItem}>
              <View style={styles.featureIconBg}>
                <Feather
                  name={feat.icon as any}
                  size={16}
                  color={Colors.accent}
                />
              </View>
              <Text style={styles.featureLabel}>{feat.label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Buttons */}
      <Animated.View
        style={[
          styles.buttonsSection,
          {
            paddingBottom: insets.bottom + 32,
            opacity: buttonsAnim,
            transform: [
              {
                translateY: buttonsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.btnPressed,
          ]}
          onPress={() => handleContinue("google")}
        >
          <Feather name="mail" size={20} color={Colors.primary} />
          <Text style={styles.primaryBtnText}>Continuar con Google</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.secondaryBtnPressed,
          ]}
          onPress={() => handleContinue("email")}
        >
          <Feather name="at-sign" size={20} color="#FFFFFF" />
          <Text style={styles.secondaryBtnText}>Continuar con Email</Text>
        </Pressable>

        <Text style={styles.legal}>
          Al continuar aceptas los Términos de Servicio y Política de Privacidad
        </Text>
      </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  content: {
    alignItems: "center",
    marginBottom: 24,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.15,
  },
  orb1: {
    width: 300,
    height: 300,
    backgroundColor: Colors.accent,
    top: -80,
    right: -80,
  },
  orb2: {
    width: 200,
    height: 200,
    backgroundColor: "#4A1080",
    bottom: 100,
    left: -60,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 36,
  },
  glowRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.accent,
    opacity: 0.15,
    top: -30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: "rgba(123, 47, 190, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  textSection: {
    alignItems: "center",
    marginBottom: 36,
  },
  appName: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    color: "rgba(200,168,255,0.9)",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  featuresRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 8,
  },
  featureItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
  },
  featureIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(123, 47, 190, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 14,
  },
  buttonsSection: {
    paddingHorizontal: 24,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  secondaryBtn: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  secondaryBtnPressed: {
    opacity: 0.8,
  },
  legal: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 8,
  },
});
