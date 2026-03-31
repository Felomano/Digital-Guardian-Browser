import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getSession } from "@/constants/session";
import { API_BASE_URL } from "@/constants/api";

type ProtectedPerson = {
  id: string;
  protectedUserEmail: string | null;
  protectedUserPhone: string | null;
  isActive: number;
  createdAt: string;
};

export default function GuardianScreen() {
  const insets = useSafeAreaInsets();
  const [guardianEnabled, setGuardianEnabled] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [protectedCircle, setProtectedCircle] = useState<ProtectedPerson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [isSavingContact, setIsSavingContact] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (session?.id) {
        setSessionId(session.id);
        await fetchProtectedCircle(session.id);
      }
    })();
  }, []);

  const fetchProtectedCircle = async (guardianId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/guardian/circle/${guardianId}`);
      if (res.ok) {
        const data = await res.json();
        setProtectedCircle(data);
        setGuardianEnabled(data.length > 0);
      }
    } catch (e) {
      console.error("Error fetching protected circle:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContactEmail.trim() && !newContactPhone.trim()) {
      Alert.alert("Error", "Ingresa un correo o número telefónico");
      return;
    }

    try {
      setIsSavingContact(true);
      const res = await fetch(`${API_BASE_URL}/guardian/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guardianId: sessionId,
          protectedUserEmail: newContactEmail || null,
          protectedUserPhone: newContactPhone || null,
        }),
      });

      if (res.ok) {
        setNewContactEmail("");
        setNewContactPhone("");
        await fetchProtectedCircle(sessionId);
        Alert.alert("Éxito", "Persona agregada al círculo protegido");
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo agregar el contacto");
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleToggleProtection = async (relationshipId: string, currentStatus: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/guardian/toggle/${relationshipId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: currentStatus === 0 ? 1 : 0 }),
      });

      if (res.ok) {
        await fetchProtectedCircle(sessionId);
        Haptics.selectionAsync();
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo cambiar el estado");
    }
  };

  const handleRemoveContact = (relationshipId: string) => {
    Alert.alert("Eliminar", "¿Eliminar de la protección?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${API_BASE_URL}/guardian/remove/${relationshipId}`, {
              method: "DELETE",
            });
            await fetchProtectedCircle(sessionId);
          } catch (e) {
            Alert.alert("Error", "No se pudo eliminar el contacto");
          }
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>Guardian</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Guardian Mode Toggle */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.cardTitle}>Modo Guardian Activado</Text>
              <Text style={styles.cardDesc}>
                Protege a tus familiares en tiempo real
              </Text>
            </View>
            <Switch
              value={guardianEnabled}
              onValueChange={(value) => {
                setGuardianEnabled(value);
                Haptics.selectionAsync();
              }}
              trackColor={{ false: Colors.cardBorder, true: Colors.accent + "55" }}
              thumbColor={guardianEnabled ? Colors.accent : Colors.textMuted}
            />
          </View>
        </View>

        {guardianEnabled && (
          <>
            {/* Add Protected Person */}
            <Text style={styles.sectionTitle}>Agregar Persona a Proteger</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Correo Electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor={Colors.textMuted}
                value={newContactEmail}
                onChangeText={setNewContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                Número Telefónico (alternativa)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="+34 600 000 000"
                placeholderTextColor={Colors.textMuted}
                value={newContactPhone}
                onChangeText={setNewContactPhone}
                keyboardType="phone-pad"
              />

              <Pressable
                style={({ pressed }) => [
                  styles.addBtn,
                  pressed && { opacity: 0.8 },
                  isSavingContact && { opacity: 0.6 },
                ]}
                onPress={handleAddContact}
                disabled={isSavingContact}
              >
                {isSavingContact ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Feather name="plus" size={18} color={Colors.white} />
                    <Text style={styles.addBtnText}>Agregar a Protección</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Protected Circle */}
            <Text style={styles.sectionTitle}>Círculo Protegido</Text>
            {isLoading ? (
              <ActivityIndicator size="large" color={Colors.accent} style={{ marginVertical: 32 }} />
            ) : protectedCircle.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="shield" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No hay personas protegidas aún</Text>
              </View>
            ) : (
              <View>
                {protectedCircle.map((person) => (
                  <View key={person.id} style={styles.personCard}>
                    <View style={styles.personInfo}>
                      <Feather
                        name="user"
                        size={20}
                        color={person.isActive ? Colors.safe : Colors.textMuted}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.personName}>
                          {person.protectedUserEmail || person.protectedUserPhone || "Sin contacto"}
                        </Text>
                        <Text style={[styles.personStatus, { color: person.isActive ? Colors.safe : Colors.textMuted }]}>
                          {person.isActive ? "🟢 Activo" : "🔴 Inactivo"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.personActions}>
                      <Pressable
                        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                        onPress={() => handleToggleProtection(person.id, person.isActive)}
                      >
                        <Feather
                          name={person.isActive ? "eye" : "eye-off"}
                          size={18}
                          color={person.isActive ? Colors.safe : Colors.textMuted}
                        />
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                        onPress={() => handleRemoveContact(person.id)}
                      >
                        <Feather name="trash-2" size={18} color={Colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Info */}
            <View style={styles.infoCard}>
              <Feather name="info" size={18} color={Colors.accent} />
              <Text style={styles.infoText}>
                Cuando alguien en tu círculo acceda a un sitio peligroso, recibirás una alerta por WhatsApp
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.cardBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.white },
  
  content: { paddingHorizontal: 20, gap: 16 },
  
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 4 },
  
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white, marginTop: 4 },
  
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.white, marginBottom: 6 },
  input: {
    backgroundColor: Colors.primary + "55",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.white,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
  
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textMuted, marginTop: 12 },
  
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  personInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  personName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.white },
  personStatus: { fontSize: 11, fontFamily: "Inter_400Regular" },
  
  personActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary + "55",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  
  infoCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.accent + "11",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.accent + "33",
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 16 },
});
