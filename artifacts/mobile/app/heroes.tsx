import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import { HEROES_ENDPOINT, REPORTS_ENDPOINT } from "@/constants/api";

type Hero = {
  id: string;
  name: string;
  reportCount: number;
  country?: string;
};

type FeedReport = {
  id: string | number;
  url: string;
  riskLevel: "danger" | "warning" | "safe";
  fraudType?: string;
  comment?: string;
  userId?: string;
  country?: string;
  reportedAt?: string;
  confidence?: number;
  userName?: string;
  userAvatar?: string;
};

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const FRAUD_LABELS: Record<string, string> = {
  phishing: "Phishing",
  precio_falso: "Precio Falso",
  clonacion: "Clonación",
  otro: "Otro",
};
const FRAUD_ICONS: Record<string, string> = {
  phishing: "anchor",
  precio_falso: "tag",
  clonacion: "copy",
  otro: "alert-circle",
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Ahora mismo";
    if (minutes < 60) return `Hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  } catch {
    return "";
  }
}

export default function HeroesScreen() {
  const insets = useSafeAreaInsets();
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [feed, setFeed] = useState<FeedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"heroes" | "feed">("heroes");

  const loadData = useCallback(async () => {
    try {
      const [heroesRes, feedRes] = await Promise.all([
        fetch(HEROES_ENDPOINT).catch(() => null),
        fetch(REPORTS_ENDPOINT).catch(() => null),
      ]);

      if (heroesRes?.ok) {
        const data = await heroesRes.json();
        setHeroes(Array.isArray(data) ? data : data.heroes ?? []);
      }
      if (feedRes?.ok) {
        const data = await feedRes.json();
        const reports = Array.isArray(data) ? data : data.reports ?? [];
        setFeed(reports);
      }
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    Haptics.selectionAsync();
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getRiskColor = (level: string) =>
    level === "danger" ? Colors.danger : level === "warning" ? Colors.warning : Colors.safe;

  const getRiskLabel = (level: string) =>
    level === "danger" ? "Peligroso" : level === "warning" ? "Sospechoso" : "Seguro";

  const renderHero = ({ item, index }: { item: Hero; index: number }) => (
    <View style={[styles.heroCard, index < 3 && { borderColor: MEDAL_COLORS[index] + "88" }]}>
      {/* Rank badge */}
      <View style={[styles.rankBadge, index < 3 && { backgroundColor: MEDAL_COLORS[index] + "22" }]}>
        {index < 3 ? (
          <Text style={[styles.medalEmoji]}>
            {["🥇", "🥈", "🥉"][index]}
          </Text>
        ) : (
          <Text style={styles.rankNum}>#{index + 1}</Text>
        )}
      </View>

      {/* Avatar placeholder */}
      <View style={[styles.avatarCircle, index < 3 && { borderColor: MEDAL_COLORS[index] }]}>
        <Feather name="shield" size={22} color={index < 3 ? MEDAL_COLORS[index] : Colors.accent} />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={styles.heroName} numberOfLines={1}>
          {item.name || `Héroe #${item.id}`}
        </Text>
        {item.country ? (
          <Text style={styles.heroCountry}>{item.country}</Text>
        ) : null}
      </View>

      {/* Score */}
      <View style={styles.scoreBadge}>
        <Feather name="flag" size={12} color={Colors.accent} />
        <Text style={styles.scoreText}>{item.reportCount}</Text>
        <Text style={styles.scoreLabel}>reportes</Text>
      </View>
    </View>
  );

  const renderFeedItem = ({ item }: { item: FeedReport }) => {
    const domain = item.url.replace(/^https?:\/\//, "").split("/")[0];
    const riskColor = getRiskColor(item.riskLevel);
    const fraudIcon = FRAUD_ICONS[item.fraudType ?? "otro"] as any;
    const fraudLabel = FRAUD_LABELS[item.fraudType ?? "otro"] ?? "Fraude";

    return (
      <View style={styles.feedCard}>
        {/* Risk dot */}
        <View style={[styles.riskDot, { backgroundColor: riskColor }]} />

        <View style={{ flex: 1, gap: 6 }}>
          {/* URL + risk label */}
          <View style={styles.feedRow}>
            <Pressable onPress={() => Linking.openURL(item.url)}>
              <Text style={styles.feedDomain} numberOfLines={1}>{domain}</Text>
            </Pressable>
            <View style={[styles.riskPill, { backgroundColor: riskColor + "22" }]}>
              <Text style={[styles.riskPillText, { color: riskColor }]}>
                {getRiskLabel(item.riskLevel)}
              </Text>
            </View>
          </View>

          {/* Fraud type + Reporter */}
          <View style={styles.fraudTypeRow}>
            {item.fraudType && (
              <>
                <Feather name={fraudIcon} size={13} color={Colors.textSecondary} />
                <Text style={styles.fraudTypeText}>{fraudLabel}</Text>
              </>
            )}
            {item.userName && (
              <View style={styles.reporterRow}>
                <Text style={styles.reporterSeparator}>·</Text>
                {item.userAvatar && (
                  <Image source={{ uri: item.userAvatar }} style={styles.reporterAvatar} />
                )}
                <Text style={styles.reporterName}>{item.userName}</Text>
              </View>
            )}
          </View>

          {/* Comment */}
          {item.comment ? (
            <View style={styles.commentBox}>
              <Feather name="message-square" size={12} color={Colors.accent} />
              <Text style={styles.commentText} numberOfLines={3}>
                {item.comment}
              </Text>
            </View>
          ) : null}

          {/* Time */}
          {item.reportedAt && (
            <Text style={styles.timeText}>{timeAgo(item.reportedAt)}</Text>
          )}
        </View>
      </View>
    );
  };

  const EmptyHeroes = () => (
    <View style={styles.emptyContainer}>
      <Feather name="award" size={44} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>Aún no hay héroes</Text>
      <Text style={styles.emptyDesc}>
        ¡Sé el primero en reportar sitios peligrosos y encabeza el ranking!
      </Text>
    </View>
  );

  const EmptyFeed = () => (
    <View style={styles.emptyContainer}>
      <Feather name="globe" size={44} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>Feed vacío</Text>
      <Text style={styles.emptyDesc}>
        Cuando la comunidad reporte sitios peligrosos, aparecerán aquí en tiempo real.
      </Text>
    </View>
  );

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

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Héroes de la Comunidad</Text>
          <Text style={styles.headerSub}>Protectores de la red</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
          onPress={onRefresh}
        >
          <Feather name="refresh-cw" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === "heroes" && styles.tabActive]}
          onPress={() => { Haptics.selectionAsync(); setActiveTab("heroes"); }}
        >
          <Feather name="award" size={16} color={activeTab === "heroes" ? Colors.white : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === "heroes" && styles.tabTextActive]}>
            Ranking
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "feed" && styles.tabActive]}
          onPress={() => { Haptics.selectionAsync(); setActiveTab("feed"); }}
        >
          <Feather name="rss" size={16} color={activeTab === "feed" ? Colors.white : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === "feed" && styles.tabTextActive]}>
            Feed Global
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Cargando datos de la comunidad…</Text>
        </View>
      ) : activeTab === "heroes" ? (
        <FlatList
          data={heroes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderHero}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          ListEmptyComponent={<EmptyHeroes />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
          ListHeaderComponent={
            heroes.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  🏆 Top {heroes.length} protectores
                </Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderFeedItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          ListEmptyComponent={<EmptyFeed />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
          ListHeaderComponent={
            feed.length > 0 ? (
              <View style={styles.listHeader}>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>EN VIVO</Text>
                </View>
                <Text style={styles.listHeaderText}>
                  {feed.length} sitios reportados por la comunidad
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 16, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.cardBg, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.cardBg, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.white },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },

  tabs: {
    flexDirection: "row", marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabActive: { backgroundColor: Colors.accent },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  tabTextActive: { color: Colors.white },

  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },

  list: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },

  listHeader: { marginBottom: 12, gap: 6 },
  listHeaderText: {
    fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
  },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger,
  },
  liveText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.danger, letterSpacing: 1.2 },

  // Hero card
  heroCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  rankBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.cardBg, alignItems: "center", justifyContent: "center",
  },
  medalEmoji: { fontSize: 20 },
  rankNum: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textSecondary },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.accent + "22",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.cardBorder,
  },
  heroName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
  heroCountry: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  scoreBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.accent + "22",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  scoreText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.white },
  scoreLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },

  // Feed card
  feedCard: {
    flexDirection: "row", gap: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  riskDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  feedRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  feedDomain: {
    fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white,
    textDecorationLine: "underline",
  },
  riskPill: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  riskPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  fraudTypeRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  fraudTypeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  reporterRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  reporterSeparator: { fontSize: 12, color: Colors.textSecondary },
  reporterAvatar: { width: 16, height: 16, borderRadius: 8 },
  reporterName: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.accent },
  reporterText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },

  commentBox: {
    flexDirection: "row", gap: 6, alignItems: "flex-start",
    backgroundColor: Colors.accent + "11",
    borderRadius: 10, padding: 10,
    borderLeftWidth: 2, borderLeftColor: Colors.accent,
  },
  commentText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 19 },

  timeText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },

  emptyContainer: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingTop: 60, paddingHorizontal: 32, gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.white },
  emptyDesc: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, textAlign: "center", lineHeight: 20,
  },
});
