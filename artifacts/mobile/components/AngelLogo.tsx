import React from "react";
import { Image, View, StyleSheet } from "react-native";

interface AngelLogoProps {
  size?: number;
  style?: object;
  rounded?: boolean;
}

export function AngelLogo({ size = 80, style, rounded = true }: AngelLogoProps) {
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: rounded ? size * 0.22 : 0 },
        style,
      ]}
    >
      <Image
        source={require("../assets/icon.png")}
        style={{ width: size, height: size, flex: 1 }}
        resizeMode="contain"
        defaultSource={require("../assets/icon.png")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
