import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "@/constants/colors";
import { AngelIcon } from "@/components/AngelIcon";

const { width } = Dimensions.get("window");

type RecentSite = {
  url: string;
  risk: "safe" | "warning" | "danger" | "unknown";
  timestamp: string;
};

const RISK_COLORS = {
  safe: Colors.safe,
  warning: Colors.warning,
  danger: Colors.danger,
  unknown: "rgba(255,255,255,0.4)",
};

const RISK_LABELS = {
  safe: "Seguro",
  warning: "Precaución",
  danger: "Peligro",
  unknown: "No analizado",
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const contentAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [recentSites, setRecentSites] = useState<RecentSite[]>([]);

  useEffect(() => {
    Animated.timing(contentAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    loadRecentSites();
  }, []);

  const loadRecentSites = async () => {
    try {
      const stored = await AsyncStorage.getItem("recent_sites");
      if (stored) {
        setRecentSites(JSON.parse(stored).slice(0, 5));
      }
    } catch (e) {}
  };

  const handleNavigate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/browser");
  };

  const openRecentSite = (url: string) => {
    Haptics.selectionAsync();
    router.push({ pathname: "/browser", params: { initialUrl: url } });
  };

  const safeCount = recentSites.filter((s) => s.risk === "safe").length;
  const dangerCount = recentSites.filter((s) => s.risk === "danger").length;

  return (
    <LinearGradient
      colors={[Colors.primary, "#0D0520", "#120830"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: contentAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Bienvenido</Text>
              <Text style={styles.headerTitle}>Ángel Browser</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Protegido</Text>
            </View>
          </View>

          {/* Hero */}
          <View style={styles.heroSection}>
            <Animated.View
              style={[
                styles.angelGlowOuter,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.angelContainer}>
              <AngelIcon
                size={120}
                primaryColor="#FFFFFF"
                accentColor="#C8A8FF"
                glowColor={Colors.accent}
              />
            </View>
            <Text style={styles.heroTitle}>Navega protegido</Text>
            <Text style={styles.heroSubtitle}>
              Cada sitio analizado antes de que interactúes con él
            </Text>
          </View>

          {/* Main CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.mainButton,
              pressed && styles.mainButtonPressed,
            ]}
            onPress={handleNavigate}
          >
            <LinearGradient
              colors={[Colors.accent, "#5B1A9A"]}
              style={styles.mainButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.mainButtonInner}>
                <View style={styles.mainButtonIconBg}>
                  <Feather name="shield" size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.mainButtonLabel}>Navegar seguro</Text>
                  <Text style={styles.mainButtonSub}>
                    Análisis de seguridad en tiempo real
                  </Text>
                </View>
                <Feather
                  name="arrow-right"
                  size={20}
                  color="rgba(255,255,255,0.7)"
                  style={{ marginLeft: "auto" }}
                />
              </View>
            </LinearGradient>
          </Pressable>

          {/* Stats */}
          {recentSites.length > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: Colors.safe }]}>
                  {safeCount}
                </Text>
                <Text style={styles.statLabel}>Seguros</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCard}>
                <Text
                  style={[styles.statNumber, { color: Colors.textPrimary }]}
                >
                  {recentSites.length}
                </Text>
                <Text style={styles.statLabel}>Analizados</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: Colors.danger }]}>
                  {dangerCount}
                </Text>
                <Text style={styles.statLabel}>Peligrosos</Text>
              </View>
            </View>
          )}

          {/* Recent sites */}
          {recentSites.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Sitios recientes</Text>
              {recentSites.map((site, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.recentItem,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => openRecentSite(site.url)}
                >
                  <View
                    style={[
                      styles.riskBadge,
                      { backgroundColor: RISK_COLORS[site.risk] + "22" },
                    ]}
                  >
                    <View
                      style={[
                        styles.riskDot,
                        { backgroundColor: RISK_COLORS[site.risk] },
                      ]}
                    />
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentUrl} numberOfLines={1}>
                      {site.url.replace(/^https?:\/\//, "").split("/")[0]}
                    </Text>
                    <Text style={styles.recentRisk}>
                      {RISK_LABELS[site.risk]}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={Colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          )}

          {/* Info cards */}
          <View style={styles.infoGrid}>
            {[
              {
                icon: "zap",
                title: "Análisis instantáneo",
                desc: "Resultados en milisegundos",
                color: "#F1C40F",
              },
              {
                icon: "users",
                title: "Red comunitaria",
                desc: "Miles de reportes verificados",
                color: Colors.safe,
              },
              {
                icon: "lock",
                title: "100% privado",
                desc: "Tus datos no se almacenan",
                color: Colors.accent,
              },
            ].map((card) => (
              <View key={card.icon} style={styles.infoCard}>
                <View
                  style={[
                    styles.infoIconBg,
                    { backgroundColor: card.color + "22" },
                  ]}
                >
                  <Feather name={card.icon as any} size={18} color={card.color} />
                </View>
                <Text style={styles.infoTitle}>{card.title}</Text>
                <Text style={styles.infoDesc}>{card.desc}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  orb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.12,
  },
  orb1: {
    width: 350,
    height: 350,
    backgroundColor: Colors.accent,
    top: -100,
    right: -100,
  },
  orb2: {
    width: 250,
    height: 250,
    backgroundColor: "#3A0870",
    bottom: 150,
    left: -80,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.safe + "22",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.safe + "44",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.safe,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.safe,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingVertical: 16,
  },
  angelGlowOuter: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.accent,
    opacity: 0.1,
    top: 0,
  },
  angelContainer: {
    width: 160,
    height: 160,
    borderRadius: 40,
    backgroundColor: "rgba(123,47,190,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  mainButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  mainButtonPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.2,
  },
  mainButtonGradient: {
    borderRadius: 20,
  },
  mainButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  mainButtonIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  mainButtonLabel: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    marginBottom: 3,
  },
  mainButtonSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.cardBorder,
  },
  recentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  riskBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  riskDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recentInfo: { flex: 1 },
  recentUrl: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.white,
    marginBottom: 2,
  },
  recentRisk: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 10,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    gap: 8,
  },
  infoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
    lineHeight: 16,
  },
  infoDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 14,
  },
  textPrimary: {
    color: Colors.white,
  },
});
