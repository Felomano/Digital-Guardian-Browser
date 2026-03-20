import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle, Ellipse, G, Defs, RadialGradient, Stop } from "react-native-svg";

type AngelIconProps = {
  size?: number;
  primaryColor?: string;
  accentColor?: string;
  glowColor?: string;
};

export function AngelIcon({
  size = 80,
  primaryColor = "#FFFFFF",
  accentColor = "#C8A8FF",
  glowColor = "#7B2FBE",
}: AngelIconProps) {
  const scale = size / 100;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="shieldGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={accentColor} stopOpacity="0.9" />
          </RadialGradient>
          <RadialGradient id="haloGrad" cx="50%" cy="30%" r="50%">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={accentColor} stopOpacity="0.3" />
          </RadialGradient>
        </Defs>

        {/* Halo */}
        <Ellipse
          cx="50"
          cy="18"
          rx="18"
          ry="5"
          fill="none"
          stroke="url(#haloGrad)"
          strokeWidth="2.5"
          opacity="0.85"
        />

        {/* Left wing */}
        <Path
          d="M28 42 C15 35, 8 48, 12 58 C16 65, 22 60, 26 55 C22 52, 20 45, 28 42Z"
          fill={accentColor}
          opacity="0.75"
        />
        <Path
          d="M28 42 C20 38, 14 50, 18 60 C14 55, 12 48, 18 40 C22 35, 28 38, 28 42Z"
          fill={primaryColor}
          opacity="0.5"
        />

        {/* Right wing */}
        <Path
          d="M72 42 C85 35, 92 48, 88 58 C84 65, 78 60, 74 55 C78 52, 80 45, 72 42Z"
          fill={accentColor}
          opacity="0.75"
        />
        <Path
          d="M72 42 C80 38, 86 50, 82 60 C86 55, 88 48, 82 40 C78 35, 72 38, 72 42Z"
          fill={primaryColor}
          opacity="0.5"
        />

        {/* Shield body */}
        <Path
          d="M50 25 L68 33 L68 52 C68 64 50 75 50 75 C50 75 32 64 32 52 L32 33 Z"
          fill="url(#shieldGrad)"
        />

        {/* Shield check mark */}
        <Path
          d="M42 50 L47 56 L59 44"
          stroke={glowColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
