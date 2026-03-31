import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { AngelLogo } from "@/components/AngelLogo";
import { getSession, clearSession, saveSession } from "@/constants/session";
import { loadSettings, saveSettings } from "@/constants/settings";
import { API_BASE_URL } from "@/constants/api";
import * as ImagePicker from "expo-image-picker";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [hideHaloOnGreen, setHideHaloOnGreen] = useState(false);
  const [sessionName, setSessionName] = useState("Usuario");
  const [sessionMethod, setSessionMethod] = useState<string>("email");
  const [userPhone, setUserPhone] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (session) {
        setSessionName(session.name ?? "Usuario");
        setSessionMethod(session.method);
        setSessionId(session.id ?? "");
        setUserPhone(session.phone ?? "");
        setUserAvatar(session.avatar ?? "");
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

  const handleSavePhone = async () => {
    if (!userPhone.trim()) {
      Alert.alert("Error", "Por favor, ingresa un número válido");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/user/phone/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userPhone }),
      });
      if (res.ok) {
        // Save phone to AsyncStorage session as well
        const session = await getSession();
        if (session) {
          await saveSession({
            ...session,
            phone: userPhone,
          });
        }
        setIsEditingPhone(false);
        Alert.alert("Éxito", "Número telefónico guardado correctamente");
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar el número");
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.cancelled && result.assets?.[0]) {
        setIsUploadingAvatar(true);
        const asset = result.assets[0];
        
        // Convert to base64 data URI
        const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

        // Upload to API with JSON
        const res = await fetch(`${API_BASE_URL}/user/avatar/${sessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: base64Data }),
        });

        if (res.ok) {
          const data = await res.json();
          const avatarUrl = data.avatar || base64Data;
          setUserAvatar(avatarUrl);

          // Save to session
          const session = await getSession();
          if (session) {
            await saveSession({
              ...session,
              avatar: avatarUrl,
            });
          }
          Alert.alert("Éxito", "Foto de perfil actualizada");
        } else {
          Alert.alert("Error", "No se pudo guardar la foto");
        }
      }
    } catch (e) {
      console.error("Error picking image:", e);
      Alert.alert("Error", "No se pudo cambiar la foto de perfil");
    } finally {
      setIsUploadingAvatar(false);
    }
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
          <Pressable style={styles.avatarPress} onPress={handlePickImage} disabled={isUploadingAvatar}>
            <View style={styles.avatarBg}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
              ) : (
                <AngelLogo size={72} />
              )}
            </View>
            {isUploadingAvatar && (
              <ActivityIndicator size="large" color={Colors.accent} style={styles.uploadingIndicator} />
            )}
            <Feather name="camera" size={20} color={Colors.accent} style={styles.cameraIcon} />
          </Pressable>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={styles.userName}>{sessionName}</Text>
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

        {/* ── Información Personal ──────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Información Personal</Text>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconBg}>
              <Feather name="smartphone" size={18} color={Colors.accent} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Número Telefónico</Text>
              {!isEditingPhone ? (
                <Text style={styles.settingValue}>{userPhone || "No configurado"}</Text>
              ) : (
                <TextInput
                  style={styles.phoneInput}
                  placeholder="+34 600 000 000"
                  placeholderTextColor={Colors.textMuted}
                  value={userPhone}
                  onChangeText={setUserPhone}
                  keyboardType="phone-pad"
                />
              )}
            </View>
            <Pressable
              style={({ pressed }) => [styles.editPhoneBtn, pressed && { opacity: 0.6 }]}
              onPress={() => {
                if (isEditingPhone) {
                  handleSavePhone();
                } else {
                  setIsEditingPhone(true);
                }
              }}
            >
              <Feather
                name={isEditingPhone ? "check" : "edit-2"}
                size={18}
                color={Colors.accent}
              />
            </Pressable>
          </View>
        </View>

        {/* Guardian Button */}
        <Pressable
          style={({ pressed }) => [styles.guardianBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.push("/guardian")}
        >
          <Feather name="shield" size={20} color={Colors.white} />
          <Text style={styles.guardianBtnText}>Protección Familiar (Guardian)</Text>
        </Pressable>

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
  avatarPress: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
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
  avatarImage: {
    width: 100, height: 100, borderRadius: 26,
  },
  uploadingIndicator: {
    position: "absolute",
  },
  cameraIcon: {
    position: "absolute",
    bottom: -8,
    right: -8,
    backgroundColor: Colors.accent + "dd",
    borderRadius: 20,
    padding: 6,
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
  
  phoneInput: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.white,
    paddingVertical: 6, paddingHorizontal: 8,
    backgroundColor: Colors.primary + "55", borderRadius: 8,
    borderWidth: 1, borderColor: Colors.accent + "33",
  },
  settingValue: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  editPhoneBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  
  guardianBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.accent + "22", borderWidth: 1, borderColor: Colors.accent + "44",
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16,
    marginTop: 4,
  },
  guardianBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
