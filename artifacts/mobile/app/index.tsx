import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import { AngelLogo } from "@/components/AngelLogo";
import { getSession, saveSession } from "@/constants/session";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const logoAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const [checking, setChecking] = useState(true);

  // ── Check existing session on mount ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const session = await getSession();
        if (session?.loggedIn) {
          // Already logged in — go straight to browser
          router.replace("/browser");
          return;
        }
      } catch {}
      setChecking(false);
    })();
  }, []);

  // ── Glow animation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (checking) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, [checking]);

  const handleContinue = async (method: "google" | "email") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveSession({ loggedIn: true, method, name: method === "google" ? "Usuario Google" : "Usuario" });
    // Skip home — go directly to browser
    router.replace("/browser");
  };

  // Show a minimal loader while checking session
  if (checking) {
    return (
      <LinearGradient
        colors={[Colors.primary, "#0D0520"]}
        style={styles.loadingScreen}
      >
        <AngelLogo size={72} />
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 24 }} />
      </LinearGradient>
    );
  }

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

      <View style={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <Animated.View style={[styles.glowRing, { opacity: glowAnim }]} />
          <View style={styles.iconContainer}>
            <AngelLogo size={110} />
          </View>
        </View>

        {/* Text */}
        <View style={styles.textSection}>
          <Text style={styles.appName}>Ángel Browser</Text>
          <Text style={styles.tagline}>Tu ángel guardián digital</Text>
          <Text style={styles.description}>
            Navega con inteligencia. Protegido en cada paso.
          </Text>
        </View>

        {/* Feature pills */}
        <View style={styles.featuresRow}>
          {[
            { icon: "shield", label: "Análisis en tiempo real" },
            { icon: "users", label: "Red comunitaria" },
            { icon: "alert-triangle", label: "Alertas instantáneas" },
          ].map((feat) => (
            <View key={feat.icon} style={styles.featureItem}>
              <View style={styles.featureIconBg}>
                <Feather name={feat.icon as any} size={16} color={Colors.accent} />
              </View>
              <Text style={styles.featureLabel}>{feat.label}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsSection}>
          <Pressable
            style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.88 }]}
            onPress={() => handleContinue("google")}
          >
            <Feather name="mail" size={20} color={Colors.primary} />
            <Text style={styles.googleBtnText}>Continuar con Google</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.emailBtn, pressed && { opacity: 0.85 }]}
            onPress={() => handleContinue("email")}
          >
            <Feather name="at-sign" size={20} color={Colors.white} />
            <Text style={styles.emailBtnText}>Continuar con Email</Text>
          </Pressable>
        </View>

        <Text style={styles.terms}>
          Al continuar aceptas los Términos de Servicio y{"\n"}Política de Privacidad
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1, alignItems: "center", justifyContent: "center",
  },
  container: { flex: 1 },
  orb: { position: "absolute", borderRadius: 999, opacity: 0.15 },
  orb1: { width: 320, height: 320, backgroundColor: Colors.accent, top: -60, right: -80 },
  orb2: { width: 250, height: 250, backgroundColor: "#4A1080", bottom: 40, left: -60 },

  content: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 28, gap: 28,
  },

  logoSection: { alignItems: "center", justifyContent: "center" },
  glowRing: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    backgroundColor: Colors.accent, opacity: 0.2,
  },
  iconContainer: {
    width: 120, height: 120, borderRadius: 28,
    backgroundColor: Colors.cardBg,
    borderWidth: 1, borderColor: Colors.cardBorder,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },

  textSection: { alignItems: "center", gap: 8 },
  appName: { fontSize: 30, fontFamily: "Inter_700Bold", color: Colors.white, textAlign: "center" },
  tagline: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.accent, textAlign: "center" },
  description: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, textAlign: "center", lineHeight: 22,
  },

  featuresRow: { flexDirection: "row", gap: 12 },
  featureItem: { flex: 1, alignItems: "center", gap: 8 },
  featureIconBg: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.cardBorder,
    alignItems: "center", justifyContent: "center",
  },
  featureLabel: {
    fontSize: 11, fontFamily: "Inter_500Medium",
    color: Colors.textSecondary, textAlign: "center",
  },

  buttonsSection: { width: "100%", gap: 12 },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 12, backgroundColor: Colors.white,
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24,
  },
  googleBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  emailBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 12, backgroundColor: Colors.accent,
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24,
  },
  emailBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },

  terms: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.textMuted, textAlign: "center", lineHeight: 18,
  },
});
