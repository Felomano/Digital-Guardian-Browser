import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "@/constants/colors";
import { AngelIcon } from "@/components/AngelIcon";

type Report = {
  url: string;
  risk: "safe" | "warning" | "danger" | "unknown";
  timestamp: string;
  source: string;
};

const RISK_CONFIG = {
  danger: { color: Colors.danger, label: "Peligroso", icon: "alert-octagon" },
  warning: { color: Colors.warning, label: "Sospechoso", icon: "alert-triangle" },
  safe: { color: Colors.safe, label: "Seguro", icon: "check-circle" },
  unknown: { color: "rgba(255,255,255,0.4)", label: "Desconocido", icon: "help-circle" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} día${days !== 1 ? "s" : ""}`;
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<Report[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("community_reports");
      const local: Report[] = stored ? JSON.parse(stored) : [];
      setReports(local);
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadReports();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleDelete = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = reports.filter((r) => r.url !== url);
    setReports(updated);
    await AsyncStorage.setItem("community_reports", JSON.stringify(updated));
  };

  const handleShare = async (url: string) => {
    Haptics.selectionAsync();
    try {
      await Share.share({
        message: `⚠️ Ángel Browser detectó este sitio como peligroso:\n${url}\n\nDescarga Ángel Browser para navegar seguro.`,
      });
    } catch (e) {}
  };

  const handleOpenInBrowser = (url: string) => {
    Haptics.selectionAsync();
    router.push({ pathname: "/browser", params: { initialUrl: url } });
  };

  const dangerCount = reports.filter((r) => r.risk === "danger").length;
  const warningCount = reports.filter((r) => r.risk === "warning").length;

  const renderItem = ({ item }: { item: Report }) => {
    const cfg = RISK_CONFIG[item.risk] || RISK_CONFIG.unknown;
    const domain = item.url.replace(/^https?:\/\//, "").split("/")[0];

    return (
      <View style={styles.reportCard}>
        <View style={[styles.riskBadge, { backgroundColor: cfg.color + "22", borderColor: cfg.color + "44" }]}>
          <Feather name={cfg.icon as any} size={20} color={cfg.color} />
        </View>

        <View style={styles.reportInfo}>
          <Text style={styles.reportDomain} numberOfLines={1}>{domain}</Text>
          <Text style={styles.reportUrl} numberOfLines={1}>{item.url}</Text>
          <View style={styles.reportMeta}>
            <View style={[styles.riskTag, { backgroundColor: cfg.color + "22" }]}>
              <Text style={[styles.riskTagText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.reportTime}>{timeAgo(item.timestamp)}</Text>
          </View>
        </View>

        <View style={styles.reportActions}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
            onPress={() => handleShare(item.url)}
          >
            <Feather name="share-2" size={16} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
            onPress={() => handleOpenInBrowser(item.url)}
          >
            <Feather name="external-link" size={16} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
            onPress={() => handleDelete(item.url)}
          >
            <Feather name="trash-2" size={16} color={Colors.danger + "99"} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[Colors.primary, "#0D0520", "#120830"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={[styles.orb, styles.orb1]} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={22} color={Colors.white} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Red Comunitaria</Text>
          <Text style={styles.subtitle}>Sitios reportados por usuarios</Text>
        </View>
        <View style={styles.angelSmall}>
          <AngelIcon size={32} primaryColor="#FFFFFF" accentColor="#C8A8FF" glowColor={Colors.accent} />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: Colors.danger }]}>{dangerCount}</Text>
          <Text style={styles.statLabel}>Peligrosos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: Colors.warning }]}>{warningCount}</Text>
          <Text style={styles.statLabel}>Sospechosos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: Colors.white }]}>{reports.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Feather name="shield" size={14} color={Colors.safe} />
        <Text style={styles.infoBannerText}>
          Cada reporte ayuda a proteger a toda la comunidad de Ángel Browser
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={reports}
        keyExtractor={(item, i) => item.url + i}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Feather name="shield" size={40} color={Colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Sin reportes aún</Text>
            <Text style={styles.emptyDesc}>
              Cuando encuentres un sitio peligroso en el navegador, repórtalo y aparecerá aquí para proteger a otros usuarios.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.browseBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.push("/browser")}
            >
              <Feather name="globe" size={18} color={Colors.white} />
              <Text style={styles.browseBtnText}>Ir al navegador</Text>
            </Pressable>
          </View>
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: { position: "absolute", borderRadius: 999, opacity: 0.1 },
  orb1: {
    width: 300, height: 300,
    backgroundColor: Colors.accent,
    top: -80, right: -80,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  headerTitle: { flex: 1 },
  title: {
    fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.white,
  },
  subtitle: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
    marginTop: 2,
  },
  angelSmall: {
    width: 44, height: 44,
    borderRadius: 12, backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.cardBorder,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 16,
  },
  statCard: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 2 },
  statLabel: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
  },
  statDivider: {
    width: 1, height: 36, backgroundColor: Colors.cardBorder,
  },

  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.safe + "15",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.safe + "33",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12, fontFamily: "Inter_500Medium",
    color: Colors.safe,
    lineHeight: 17,
  },

  listContent: { paddingHorizontal: 20 },

  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    gap: 12,
  },
  riskBadge: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, flexShrink: 0,
  },
  reportInfo: { flex: 1, minWidth: 0 },
  reportDomain: {
    fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white, marginBottom: 2,
  },
  reportUrl: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 6,
  },
  reportMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  riskTag: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  riskTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  reportTime: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted,
  },

  reportActions: { flexDirection: "column", gap: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },

  separator: { height: 10 },

  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconBg: {
    width: 90, height: 90, borderRadius: 26,
    backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.cardBorder,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.white,
  },
  emptyDesc: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
    textAlign: "center", lineHeight: 22,
  },
  browseBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.accent,
    paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 14, marginTop: 8,
  },
  browseBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
