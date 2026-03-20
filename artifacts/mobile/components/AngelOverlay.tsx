import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Modal,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { AngelIcon } from "@/components/AngelIcon";

type RiskLevel = "safe" | "warning" | "danger" | "loading" | "unknown";

type AngelOverlayProps = {
  riskLevel: RiskLevel;
  currentUrl: string;
  onGoBack: () => void;
  onContinue: () => void;
  onReport: () => void;
  isAlertVisible: boolean;
  setAlertVisible: (v: boolean) => void;
};

const RISK_CONFIG = {
  safe: {
    haloColor: Colors.safe,
    label: "Sitio seguro",
    description: null,
    showAlert: false,
  },
  warning: {
    haloColor: Colors.warning,
    label: "Precaución",
    description: "Sitio poco conocido. Navega con precaución.",
    showAlert: true,
  },
  danger: {
    haloColor: Colors.danger,
    label: "Peligro detectado",
    description: "Posible estafa detectada",
    showAlert: true,
  },
  loading: {
    haloColor: Colors.accent,
    label: "Analizando...",
    description: null,
    showAlert: false,
  },
  unknown: {
    haloColor: "rgba(255,255,255,0.3)",
    label: "Sin analizar",
    description: null,
    showAlert: false,
  },
};

export function AngelOverlay({
  riskLevel,
  currentUrl,
  onGoBack,
  onContinue,
  onReport,
  isAlertVisible,
  setAlertVisible,
}: AngelOverlayProps) {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const haloOpacity = useRef(new Animated.Value(0.6)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  const config = RISK_CONFIG[riskLevel];

  useEffect(() => {
    if (riskLevel === "danger") {
      // Vibration + shake
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 4,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -4,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 2,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.delay(2000),
        ]),
        { iterations: 3 }
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(haloOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (riskLevel === "warning") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.loop(
        Animated.sequence([
          Animated.timing(haloOpacity, {
            toValue: 0.9,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (riskLevel === "loading") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      shakeAnim.setValue(0);
      haloOpacity.setValue(riskLevel === "safe" ? 0.4 : 0.2);
    }
  }, [riskLevel]);

  useEffect(() => {
    if (isAlertVisible) {
      Animated.spring(modalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }).start();
    } else {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isAlertVisible]);

  const handleOverlayPress = () => {
    Haptics.selectionAsync();
    if (config.showAlert) {
      setAlertVisible(true);
    }
  };

  const iconColor =
    riskLevel === "safe"
      ? "#FFFFFF"
      : riskLevel === "warning"
        ? "#FFFFFF"
        : riskLevel === "danger"
          ? "#FFFFFF"
          : "#FFFFFF";

  return (
    <>
      {/* Floating overlay button */}
      <Pressable
        style={[styles.floatingBtn, { bottom: insets.bottom + 20 }]}
        onPress={handleOverlayPress}
      >
        <Animated.View
          style={[
            styles.haloOuter,
            {
              backgroundColor: config.haloColor + "22",
              borderColor: config.haloColor + "55",
              opacity: haloOpacity,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: Colors.overlayBg,
              borderColor: config.haloColor + "88",
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          <AngelIcon
            size={32}
            primaryColor={iconColor}
            accentColor={config.haloColor}
            glowColor={config.haloColor}
          />
          {riskLevel !== "safe" && riskLevel !== "unknown" && (
            <View
              style={[
                styles.riskIndicator,
                { backgroundColor: config.haloColor },
              ]}
            />
          )}
        </Animated.View>
      </Pressable>

      {/* Alert modal */}
      <Modal
        visible={isAlertVisible}
        transparent
        animationType="none"
        onRequestClose={() => setAlertVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAlertVisible(false)}
        >
          <Animated.View
            style={[
              styles.alertSheet,
              {
                transform: [
                  {
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
                opacity: modalAnim,
              },
            ]}
          >
            <LinearGradient
              colors={["#1E0A3C", Colors.primary]}
              style={styles.alertContent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.grabber} />

              {/* Risk header */}
              <View style={styles.alertHeader}>
                <View
                  style={[
                    styles.alertIconBg,
                    { backgroundColor: config.haloColor + "22" },
                  ]}
                >
                  <AngelIcon
                    size={48}
                    primaryColor="#FFFFFF"
                    accentColor={config.haloColor}
                    glowColor={config.haloColor}
                  />
                </View>
                <View style={styles.alertHeaderText}>
                  <View style={styles.riskLabelRow}>
                    <View
                      style={[
                        styles.riskLabelDot,
                        { backgroundColor: config.haloColor },
                      ]}
                    />
                    <Text
                      style={[styles.riskLabel, { color: config.haloColor }]}
                    >
                      {config.label.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.alertTitle}>
                    {riskLevel === "danger"
                      ? "Posible estafa detectada"
                      : "Sitio poco conocido"}
                  </Text>
                </View>
              </View>

              {/* URL */}
              <View style={styles.urlBox}>
                <Feather name="globe" size={14} color={Colors.textSecondary} />
                <Text style={styles.urlText} numberOfLines={1}>
                  {currentUrl.replace(/^https?:\/\//, "").split("/")[0]}
                </Text>
              </View>

              {/* Description */}
              <Text style={styles.alertDescription}>
                {config.description}
              </Text>

              {/* Actions */}
              <View style={styles.actionButtons}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.backBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => {
                    setAlertVisible(false);
                    onGoBack();
                  }}
                >
                  <Feather name="arrow-left" size={18} color={Colors.white} />
                  <Text style={styles.backBtnText}>Volver</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.continueBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => {
                    setAlertVisible(false);
                    onContinue();
                  }}
                >
                  <Text style={styles.continueBtnText}>Continuar bajo riesgo</Text>
                  <Feather name="alert-triangle" size={16} color={Colors.warning} />
                </Pressable>
              </View>

              {/* Report button */}
              <Pressable
                style={({ pressed }) => [
                  styles.reportBtn,
                  pressed && { opacity: 0.8 },
                  { marginBottom: insets.bottom + 8 },
                ]}
                onPress={() => {
                  setAlertVisible(false);
                  onReport();
                }}
              >
                <Feather name="flag" size={16} color={Colors.danger} />
                <Text style={styles.reportBtnText}>Reportar este sitio</Text>
              </Pressable>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingBtn: {
    position: "absolute",
    right: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  haloOuter: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  riskIndicator: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  alertSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  alertContent: {
    padding: 24,
    paddingTop: 12,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignSelf: "center",
    marginBottom: 24,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  alertIconBg: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  alertHeaderText: { flex: 1 },
  riskLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  riskLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  alertTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    lineHeight: 26,
  },
  urlBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  urlText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    flex: 1,
  },
  alertDescription: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  continueBtn: {
    backgroundColor: "rgba(241,196,15,0.12)",
    borderWidth: 1,
    borderColor: Colors.warning + "44",
  },
  continueBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.danger + "44",
    backgroundColor: Colors.danger + "11",
  },
  reportBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
  },
});
