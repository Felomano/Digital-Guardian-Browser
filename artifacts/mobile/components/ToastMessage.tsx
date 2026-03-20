import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type ToastProps = {
  visible: boolean;
  message: string;
  type?: "success" | "info" | "warning";
};

const TOAST_COLORS = {
  success: Colors.safe,
  info: Colors.accent,
  warning: Colors.warning,
};

const TOAST_ICONS = {
  success: "check-circle",
  info: "info",
  warning: "alert-triangle",
};

export function ToastMessage({ visible, message, type = "info" }: ToastProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible && anim.__getValue() === 0) return null;

  const color = TOAST_COLORS[type];
  const icon = TOAST_ICONS[type];

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          borderColor: color + "55",
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.iconBg, { backgroundColor: color + "22" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1E0A3C",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.white,
    lineHeight: 20,
  },
});
