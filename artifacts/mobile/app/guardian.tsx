import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import {
  getProtectedCircle,
  addProtectedPerson,
  updateProtectedPerson,
  removeProtectedPerson,
  type ProtectedPerson,
} from "@/constants/guardian-storage";


export default function GuardianScreen() {
  const insets = useSafeAreaInsets();
  const [guardianEnabled, setGuardianEnabled] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [protectedCircle, setProtectedCircle] = useState<ProtectedPerson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [isSavingContact, setIsSavingContact] = useState(false);

  // ✅ MEJORADO: Persistencia centralizada del modo guardian
  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (session?.id) {
        setSessionId(session.id);
        // Load from local storage first
        const local = await getProtectedCircle();
        setProtectedCircle(local);
        
        // ✅ Cargar siempre el valor guardado de forma centralizada
        try {
          const savedState = await AsyncStorage.getItem("angel_guardian_enabled");
          const enabled = savedState === "true"; // Verificación explícita
          setGuardianEnabled(enabled);
        } catch (e) {
          console.error("Error loading guardian state:", e);
          setGuardianEnabled(false);
        }
        
        // Then sync with API
        await fetchProtectedCircle(session.id);
      }
    })();
  }, []);

  // ✅ MEJORADO: Toggle mejorado con persistencia segura
  const toggleGuardian = async (enabled: boolean) => {
    setGuardianEnabled(enabled);
    try {
      await AsyncStorage.setItem("angel_guardian_enabled", enabled ? "true" : "false");
      Haptics.selectionAsync();
    } catch (e) {
      console.error("Error saving guardian state:", e);
      Alert.alert("Error", "No se pudo guardar el estado");
    }
  };

  const fetchProtectedCircle = async (guardianId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/guardian/circle/${guardianId}`);
      if (res.ok) {
        const data = await res.json();
        // Transform API response
        const transformed: ProtectedPerson[] = data.map((item: any) => ({
          id: item.id,
          name: item.name, // ✅ Incluir nombre desde API
          email: item.protectedUserEmail,
          phone: item.protectedUserPhone,
          isActive: item.isActive === 1,
        }));
        setProtectedCircle(transformed);
        
        // ✅ Actualizar guardian state si hay personas protegidas
        if (transformed.length > 0 && !guardianEnabled) {
          setGuardianEnabled(true);
          await AsyncStorage.setItem("angel_guardian_enabled", "true");
        }
        
        // Persist to local storage
        await saveProtectedCircle(transformed);
      }
    } catch (e) {
      console.error("Error fetching protected circle:", e);
      const local = await getProtectedCircle();
      setProtectedCircle(local);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProtectedCircle = async (circle: ProtectedPerson[]) => {
    try {
      await Promise.all(circle.map((p) =>
        updateProtectedPerson(p.id, { 
          name: p.name,
          isActive: p.isActive, 
          email: p.email, 
          phone: p.phone 
        })
      ));
    } catch (e) {
      console.error("Error saving to local storage:", e);
    }
  };

  // ✅ MEJORADO: Agregar contacto con nombre y sincronización mejorada
  const handleAddContact = async () => {
    if (!newContactEmail.trim() && !newContactPhone.trim()) {
      Alert.alert("Error", "Ingresa un correo o número telefónico");
      return;
    }

    if (!newContactName.trim()) {
      Alert.alert("Error", "Por favor, ingresa el nombre del familiar");
      return;
    }

    try {
      setIsSavingContact(true);
      // Save to API con NOMBRE incluido
      const res = await fetch(`${API_BASE_URL}/guardian/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guardianId: sessionId,
          name: newContactName, // ✅ AHORA SÍ enviamos el nombre
          protectedUserEmail: newContactEmail || null,
          protectedUserPhone: newContactPhone || null,
        }),
      });

      if (res.ok) {
        const apiData = await res.json();
        
        // También save locally
        const newPerson: ProtectedPerson = {
          id: apiData.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: newContactName, // ✅ Guardar nombre localmente
          email: newContactEmail || undefined,
          phone: newContactPhone || undefined,
          isActive: true,
        };
        
        await addProtectedPerson(newPerson);

        // ✅ Limpiar formulario
        setNewContactName("");
        setNewContactEmail("");
        setNewContactPhone("");
        
        // ✅ Actualizar listado inmediatamente
        setProtectedCircle([...protectedCircle, newPerson]);
        
        // ✅ Activar guardian automáticamente
        setGuardianEnabled(true);
        await AsyncStorage.setItem("angel_guardian_enabled", "true");
        
        Alert.alert("Éxito", `${newContactName} agregado al círculo protegido`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Error", "No se pudo agregar el contacto");
      }
    } catch (e) {
      console.error("Error adding contact:", e);
      Alert.alert("Error", "Error al agregar el contacto");
    } finally {
      setIsSavingContact(false);
    }
  };

  // ✅ MEJORADO: Toggle protección con feedback visual
  const handleToggleProtection = async (relationshipId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      // Update API
      await fetch(`${API_BASE_URL}/guardian/toggle/${relationshipId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus ? 1 : 0 }),
      });

      // Update local storage
      await updateProtectedPerson(relationshipId, { isActive: newStatus });
      
      await fetchProtectedCircle(sessionId);
      Haptics.selectionAsync();
    } catch (e) {
      console.error("Error toggling protection:", e);
      Alert.alert("Error", "No se pudo cambiar el estado");
    }
  };

  // ✅ MEJORADO: Eliminar contacto con verificación
  const handleRemoveContact = (relationshipId: string, personName: string) => {
    Alert.alert(
      "Eliminar",
      `¿Eliminar a ${personName} de la protección?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              // Remove from API
              await fetch(`${API_BASE_URL}/guardian/remove/${relationshipId}`, {
                method: "DELETE",
              });
              
              // Remove from local storage
              await removeProtectedPerson(relationshipId);
              
              // Actualizar estado
              const newCircle = protectedCircle.filter(p => p.id !== relationshipId);
              setProtectedCircle(newCircle);
              
              // ✅ Si no quedan familiares, desactivar guardian
              if (newCircle.length === 0) {
                setGuardianEnabled(false);
                await AsyncStorage.setItem("angel_guardian_enabled", "false");
                Alert.alert("Información", "No hay más personas protegidas. Modo guardian desactivado.");
              }
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              console.error("Error removing contact:", e);
              Alert.alert("Error", "No se pudo eliminar el contacto");
            }
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
              onValueChange={toggleGuardian}
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
              {/* ✅ NOMBRE AHORA ES REQUERIDO */}
              <Text style={styles.fieldLabel}>Nombre del Familiar *</Text>
              <TextInput
                style={styles.input}
                placeholder="ej: María García"
                placeholderTextColor={Colors.textMuted}
                value={newContactName}
                onChangeText={setNewContactName}
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Correo Electrónico</Text>
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
            <Text style={styles.sectionTitle}>Círculo Protegido ({protectedCircle.length})</Text>
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
                      <View style={[
                        styles.avatarCircle,
                        { backgroundColor: person.isActive ? Colors.safe + "22" : Colors.textMuted + "22" }
                      ]}>
                        <Text style={styles.avatarInitial}>
                          {(person.name || person.email || person.phone || "?")[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.personName}>
                          {person.name || person.email || person.phone || "Sin nombre"}
                        </Text>
                        {(person.email || person.phone) && (
                          <Text style={styles.personContact}>
                            {person.email || person.phone}
                          </Text>
                        )}
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
                        onPress={() => handleRemoveContact(person.id, person.name || "Contacto")}
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },

  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
  },

  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },

  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
    marginBottom: 4,
  },

  cardDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },

  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 6,
  },

  input: {
    backgroundColor: Colors.primary + "44",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.white,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    fontSize: 14,
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
  },

  addBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.white,
  },

  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderStyle: "dashed",
  },

  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginTop: 8,
  },

  personCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 8,
  },

  personInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },

  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },

  avatarInitial: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },

  personName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.white },
  personStatus: { fontSize: 11, fontFamily: "Inter_400Regular" },
  personContact: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  
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
    marginTop: 8,
  },

  infoText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
});
