import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { REPORT_ENDPOINT } from "@/constants/api";

type FraudType = "phishing" | "precio_falso" | "clonacion" | "otro";

const FRAUD_TYPES: { type: FraudType; label: string; icon: string; color: string }[] = [
  { type: "phishing",    label: "Phishing",      icon: "anchor",       color: Colors.danger },
  { type: "precio_falso", label: "Precio Falso",  icon: "tag",          color: Colors.warning },
  { type: "clonacion",   label: "Clonación",     icon: "copy",         color: "#E67E22" },
  { type: "otro",        label: "Otro",           icon: "alert-circle", color: Colors.textSecondary },
];

interface ReportModalProps {
  visible: boolean;
  url: string;
  userId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReportModal({ visible, url, userId, onClose, onSuccess }: ReportModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const [fraudType, setFraudType] = useState<FraudType | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, tension: 80, friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 400, duration: 200, useNativeDriver: true,
      }).start();
      // Reset on close
      setTimeout(() => {
        setFraudType(null);
        setComment("");
      }, 250);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!fraudType) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSubmitting(true);

    try {
      await fetch(REPORT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          userId: userId ?? "anonymous",
          risk_level: "danger",
          fraud_type: fraudType,
          comment: comment.trim() || null,
          source: "angel-browser",
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      // Still show success even if API is unreachable
    } finally {
      setSubmitting(false);
      onSuccess();
    }
  };

  const domain = url.replace(/^https?:\/\//, "").split("/")[0];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.kav}
        >
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          >
            <LinearGradient
              colors={["#1E0A3C", Colors.primary]}
              style={[styles.content, { paddingBottom: insets.bottom + 16 }]}
            >
              <View style={styles.grabber} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerIcon}>
                  <Feather name="flag" size={22} color={Colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Reportar sitio peligroso</Text>
                  <Text style={styles.domain} numberOfLines={1}>{domain}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
                  onPress={onClose}
                >
                  <Feather name="x" size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {/* Fraud type */}
              <Text style={styles.sectionLabel}>Tipo de fraude *</Text>
              <View style={styles.typeGrid}>
                {FRAUD_TYPES.map((ft) => (
                  <Pressable
                    key={ft.type}
                    style={({ pressed }) => [
                      styles.typeBtn,
                      fraudType === ft.type && { borderColor: ft.color, backgroundColor: ft.color + "22" },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setFraudType(ft.type);
                    }}
                  >
                    <Feather
                      name={ft.icon as any}
                      size={20}
                      color={fraudType === ft.type ? ft.color : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        fraudType === ft.type && { color: ft.color, fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      {ft.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Comment */}
              <Text style={styles.sectionLabel}>Comentario (opcional)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder='Ej: "Usan el logo de Lidl para vender barbacoas falsas"'
                placeholderTextColor={Colors.textMuted}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                maxLength={280}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{comment.length}/280</Text>

              {/* Submit */}
              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  !fraudType && styles.submitBtnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleSubmit}
                disabled={submitting || !fraudType}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Feather name="send" size={18} color={Colors.white} />
                    <Text style={styles.submitText}>Enviar reporte a la comunidad</Text>
                  </>
                )}
              </Pressable>

              <Text style={styles.disclaimer}>
                Tu reporte ayuda a proteger a miles de usuarios. Gracias.
              </Text>
            </LinearGradient>
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end",
  },
  kav: { justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  content: { padding: 24, paddingTop: 12, gap: 12 },

  grabber: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 8,
  },

  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.danger + "22",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.danger + "44",
  },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.white },
  domain: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.cardBg, alignItems: "center", justifyContent: "center",
  },

  sectionLabel: {
    fontSize: 13, fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary, marginTop: 4,
  },

  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeBtn: {
    flex: 1, minWidth: "44%",
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.cardBg,
    borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
  },
  typeLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },

  commentInput: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: 14, padding: 14,
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.white, minHeight: 80,
  },
  charCount: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.textMuted, textAlign: "right", marginTop: -8,
  },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: Colors.danger,
    borderRadius: 14, paddingVertical: 15, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },

  disclaimer: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.textMuted, textAlign: "center",
  },
});
