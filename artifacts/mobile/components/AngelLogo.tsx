import React from "react";
import { Image, View, StyleSheet } from "react-native";

interface AngelLogoProps {
  size?: number;
  style?: object;
}

const logoImage = require("../assets/angel-logo.jpg");

export function AngelLogo({ size = 80, style }: AngelLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image
        source={logoImage}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
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
