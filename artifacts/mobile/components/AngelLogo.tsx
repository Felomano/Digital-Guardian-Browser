import React from "react";
import { Image, View, StyleSheet } from "react-native";

interface AngelLogoProps {
  size?: number;
  style?: object;
  rounded?: boolean;
}

const logoImage = require("../assets/icon.png");

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
        source={logoImage}
        style={{ width: size, height: size }}
        resizeMode="cover"
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
