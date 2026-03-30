import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { AngelLogo } from "@/components/AngelLogo";
import { getSession, clearSession } from "@/constants/session";
import { loadSettings, saveSettings } from "@/constants/settings";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [hideHaloOnGreen, setHideHaloOnGreen] = useState(false);
  const [sessionName, setSessionName] = useState("Usuario");
  const [sessionMethod, setSessionMethod] = useState<string>("email");

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (session) {
        setSessionName(session.name ?? "Usuario");
        setSessionMethod(session.method);
      }
      const settings = await loadSettings();
      setHideHaloOnGreen(settings.hideHaloOnGreen);
    })();
  }, []);

  const handleToggleHalo = async (value: boolean) => {
    Haptics.selectionAsync();
    setHideHaloOnGreen(value);
    await saveSettings({ hideHaloOnGreen: value });
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Cerrar sesión",
      "¿Seguro que quieres salir de Ángel Browser?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir",
          style: "destructive",
          onPress: async () => {
            await clearSession();
            router.replace("/");
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={[Colors.primary, "#0A0618"]} style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarBg}>
            <AngelLogo size={72} />
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={styles.userName}>{sessionName}</Text>
            <View style={styles.methodBadge}>
              <Feather
                name={sessionMethod === "google" ? "mail" : "at-sign"}
                size={12}
                color={Colors.accent}
              />
              <Text style={styles.methodText}>
                {sessionMethod === "google" ? "Google" : "Email"}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { icon: "flag", label: "Reportes", value: "0", color: Colors.danger },
            { icon: "shield", label: "Protegido", value: "✓", color: Colors.safe },
            { icon: "award", label: "Rango", value: "—", color: Colors.warning },
          ].map((stat) => (
            <View key={stat.icon} style={styles.statCard}>
              <Feather name={stat.icon as any} size={18} color={stat.color} />
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Preferencias de Seguridad ────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Preferencias de seguridad</Text>

        <View style={styles.settingsCard}>
          {/* hideHaloOnGreen setting */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconBg}>
              <Feather name="eye-off" size={18} color={Colors.safe} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>
                Ocultar el Ángel si el sitio es Seguro (Verde)
              </Text>
              <Text style={styles.settingDesc}>
                El halo y el botón se ocultan en sitios seguros. Siempre visible en alerta amarilla o roja.
              </Text>
            </View>
            <Switch
              value={hideHaloOnGreen}
              onValueChange={handleToggleHalo}
              trackColor={{ false: Colors.cardBorder, true: Colors.safe + "88" }}
              thumbColor={hideHaloOnGreen ? Colors.safe : Colors.textMuted}
              ios_backgroundColor={Colors.cardBg}
            />
          </View>
        </View>

        {/* ── Acerca de ─────────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Acerca de</Text>

        <View style={styles.settingsCard}>
          {[
            { icon: "info", label: "Versión", value: "1.0.0" },
            { icon: "lock", label: "Privacidad", value: "100% local" },
            { icon: "zap", label: "Motor de análisis", value: "3 capas" },
          ].map((item, i, arr) => (
            <View
              key={item.icon}
              style={[styles.infoRow, i < arr.length - 1 && styles.infoRowBorder]}
            >
              <View style={styles.settingIconBg}>
                <Feather name={item.icon as any} size={16} color={Colors.accent} />
              </View>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.cardBg, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.white },

  content: { paddingHorizontal: 20, gap: 12 },

  avatarCard: {
    alignItems: "center", gap: 14,
    backgroundColor: Colors.cardBg,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: Colors.cardBorder,
    marginBottom: 4,
  },
  avatarBg: {
    width: 100, height: 100, borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.accent + "55",
    overflow: "hidden",
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.white },
  methodBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.accent + "22",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.accent + "44",
  },
  methodText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.accent },

  statsRow: {
    flexDirection: "row", gap: 10, marginBottom: 4,
  },
  statCard: {
    flex: 1, alignItems: "center", gap: 4,
    backgroundColor: Colors.cardBg,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },

  sectionTitle: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted, letterSpacing: 1,
    textTransform: "uppercase", marginTop: 8,
  },

  settingsCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.cardBorder,
    overflow: "hidden",
  },

  settingRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 16,
  },
  settingIconBg: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  settingInfo: { flex: 1, gap: 3 },
  settingLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
  settingDesc: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.textMuted, lineHeight: 17,
  },

  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  infoLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.white },
  infoValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },

  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.danger + "18",
    borderRadius: 16, paddingVertical: 15, marginTop: 8,
    borderWidth: 1, borderColor: Colors.danger + "44",
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.danger },
});
