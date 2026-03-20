import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Platform,
  Animated,
  Linking,
} from "react-native";

// WebView only works on native (iOS/Android), not on web
let WebView: any = null;
let WebViewNavigationType: any = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const webviewModule = require("react-native-webview");
  WebView = webviewModule.WebView;
}
type WebViewNavigation = {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
};
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "@/constants/colors";
import { AngelOverlay } from "@/components/AngelOverlay";
import { ToastMessage } from "@/components/ToastMessage";

const SECURITY_API = "https://angelsecurity.base44.app/api/check-security";
const REPORT_API = "https://angelsecurity.base44.app/api/report-scam";
const DEFAULT_URL = "https://www.google.com";
const SEARCH_ENGINE = "https://www.google.com/search?q=";

type RiskLevel = "safe" | "warning" | "danger" | "loading" | "unknown";

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_URL;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Check if it looks like a domain
  if (trimmed.includes(".") && !trimmed.includes(" ")) {
    return "https://" + trimmed;
  }

  // Otherwise treat as search
  return SEARCH_ENGINE + encodeURIComponent(trimmed);
}

export default function BrowserScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ initialUrl?: string }>();

  const [currentUrl, setCurrentUrl] = useState(
    params.initialUrl || DEFAULT_URL
  );
  const [inputUrl, setInputUrl] = useState(
    params.initialUrl || DEFAULT_URL
  );
  const [webViewUrl, setWebViewUrl] = useState(
    params.initialUrl || DEFAULT_URL
  );
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("unknown");
  const [isLoading, setIsLoading] = useState(true);
  const [isAlertVisible, setAlertVisible] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as any });
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isInputFocused, setInputFocused] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkSecurity(currentUrl);
    return () => {
      if (checkTimeout.current) clearTimeout(checkTimeout.current);
    };
  }, []);

  const animateProgress = (toValue: number) => {
    Animated.timing(progressAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const checkSecurity = useCallback(async (url: string) => {
    if (!url || url.startsWith("about:") || url === "about:blank") return;
    setRiskLevel("loading");

    try {
      const response = await fetch(
        `${SECURITY_API}?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (!response.ok) throw new Error("API error");

      const data = await response.json();
      const risk: RiskLevel = data.risk_level || "unknown";
      setRiskLevel(risk);

      if (risk === "warning" || risk === "danger") {
        // Small delay before showing the alert
        checkTimeout.current = setTimeout(() => {
          setAlertVisible(true);
        }, 800);
      }

      // Save to recent sites
      await saveRecentSite(url, risk);
    } catch (e) {
      setRiskLevel("unknown");
    }
  }, []);

  const saveRecentSite = async (url: string, risk: RiskLevel) => {
    try {
      const stored = await AsyncStorage.getItem("recent_sites");
      const existing = stored ? JSON.parse(stored) : [];
      const filtered = existing.filter((s: any) => s.url !== url);
      const updated = [
        { url, risk, timestamp: new Date().toISOString() },
        ...filtered,
      ].slice(0, 20);
      await AsyncStorage.setItem("recent_sites", JSON.stringify(updated));
    } catch (e) {}
  };

  const handleNavigate = () => {
    Keyboard.dismiss();
    const normalized = normalizeUrl(inputUrl);
    setCurrentUrl(normalized);
    setWebViewUrl(normalized);
    setInputUrl(normalized);
    setWebViewError(null);
    setRiskLevel("unknown");
    checkSecurity(normalized);
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);

    if (navState.url && navState.url !== "about:blank" && navState.url !== currentUrl) {
      setCurrentUrl(navState.url);
      if (!isInputFocused) {
        setInputUrl(navState.url);
      }
      checkSecurity(navState.url);
    }
  };

  const handleReport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await fetch(REPORT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: currentUrl,
          source: "angel-browser",
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {}

    showToast(
      "Gracias por ayudar a proteger a otros usuarios",
      "success"
    );
  };

  const showToast = (message: string, type: "success" | "info" | "warning" = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500);
  };

  const handleGoBack = () => {
    if (canGoBack) {
      webViewRef.current?.goBack();
    } else {
      router.back();
    }
  };

  const handleOpenExternal = () => {
    Linking.openURL(currentUrl);
  };

  const getRiskBarColor = () => {
    switch (riskLevel) {
      case "safe":
        return Colors.safe;
      case "warning":
        return Colors.warning;
      case "danger":
        return Colors.danger;
      case "loading":
        return Colors.accent;
      default:
        return "transparent";
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        {/* Back button */}
        <Pressable
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
          onPress={() => {
            if (canGoBack) {
              webViewRef.current?.goBack();
            } else {
              router.back();
            }
          }}
        >
          <Feather
            name={canGoBack ? "chevron-left" : "arrow-left"}
            size={22}
            color={Colors.white}
          />
        </Pressable>

        {/* URL bar */}
        <View
          style={[
            styles.urlBar,
            isInputFocused && styles.urlBarFocused,
          ]}
        >
          {/* Risk indicator dot */}
          {riskLevel !== "unknown" && riskLevel !== "loading" && (
            <View
              style={[
                styles.urlRiskDot,
                { backgroundColor: getRiskBarColor() },
              ]}
            />
          )}
          {riskLevel === "loading" && (
            <ActivityIndicator size="small" color={Colors.accent} style={{ width: 14 }} />
          )}

          <TextInput
            style={styles.urlInput}
            value={isInputFocused ? inputUrl : inputUrl.replace(/^https?:\/\//, "").split("?")[0]}
            onChangeText={setInputUrl}
            onFocus={() => {
              setInputFocused(true);
              setInputUrl(currentUrl);
            }}
            onBlur={() => setInputFocused(false)}
            onSubmitEditing={handleNavigate}
            placeholder="Buscar o ingresar URL"
            placeholderTextColor={Colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            selectTextOnFocus
            returnKeyType="go"
          />

          {isInputFocused && (
            <Pressable onPress={handleNavigate} style={styles.goBtn}>
              <Feather name="arrow-right" size={16} color={Colors.white} />
            </Pressable>
          )}
        </View>

        {/* More options */}
        <Pressable
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
          onPress={handleOpenExternal}
        >
          <Feather name="external-link" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Risk progress bar */}
      <View style={styles.riskBar}>
        <Animated.View
          style={[
            styles.riskBarFill,
            {
              backgroundColor: getRiskBarColor(),
              opacity: isLoading ? 1 : 0,
            },
          ]}
        />
      </View>

      {/* WebView */}
      {webViewError ? (
        <View style={styles.errorScreen}>
          <View style={styles.errorIconBg}>
            <Feather name="wifi-off" size={36} color={Colors.textSecondary} />
          </View>
          <Text style={styles.errorTitle}>
            Este sitio no permite navegación interna.
          </Text>
          <Text style={styles.errorMessage}>
            Puedes abrirlo en tu navegador externo.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.openExternalBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleOpenExternal}
          >
            <Feather name="external-link" size={18} color={Colors.white} />
            <Text style={styles.openExternalText}>
              Abrir en navegador externo
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.goBackBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => {
              setWebViewError(null);
              setWebViewUrl(DEFAULT_URL);
              setCurrentUrl(DEFAULT_URL);
              setInputUrl(DEFAULT_URL);
            }}
          >
            <Text style={styles.goBackText}>Ir a la página de inicio</Text>
          </Pressable>
        </View>
      ) : Platform.OS === "web" ? (
        <View style={styles.webOnlyScreen}>
          <View style={styles.webOnlyIconBg}>
            <Feather name="smartphone" size={40} color={Colors.accent} />
          </View>
          <Text style={styles.webOnlyTitle}>Funciona en dispositivos móviles</Text>
          <Text style={styles.webOnlyDesc}>
            El navegador Ángel está optimizado para iOS y Android. Descarga la app para navegar con protección en tiempo real.
          </Text>
          <View style={styles.webOnlyUrlBox}>
            <Feather name="globe" size={14} color={Colors.textSecondary} />
            <Text style={styles.webOnlyUrl} numberOfLines={1}>
              {currentUrl.replace(/^https?:\/\//, "").split("/")[0]}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.openExternalBtn, pressed && { opacity: 0.8 }]}
            onPress={handleOpenExternal}
          >
            <Feather name="external-link" size={18} color={Colors.white} />
            <Text style={styles.openExternalText}>Abrir en navegador externo</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: webViewUrl }}
          style={styles.webView}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={() => {
            setIsLoading(true);
            setWebViewError(null);
          }}
          onLoadEnd={() => setIsLoading(false)}
          onError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.code !== -999) {
              setWebViewError(nativeEvent.description || "Error loading page");
              setIsLoading(false);
            }
          }}
          onHttpError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.statusCode === 403 || nativeEvent.statusCode === 401) {
              setWebViewError("This site has restricted access.");
              setIsLoading(false);
            }
          }}
          javaScriptEnabled
          domStorageEnabled
          allowsBackForwardNavigationGestures
          sharedCookiesEnabled
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          renderLoading={() => (
            <View style={styles.loadingScreen}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          )}
          startInLoadingState
        />
      )}

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 4 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.bottomBtn,
            pressed && { opacity: 0.5 },
            !canGoBack && styles.bottomBtnDisabled,
          ]}
          onPress={() => webViewRef.current?.goBack()}
          disabled={!canGoBack}
        >
          <Feather name="chevron-left" size={24} color={canGoBack ? Colors.white : Colors.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.bottomBtn,
            pressed && { opacity: 0.5 },
            !canGoForward && styles.bottomBtnDisabled,
          ]}
          onPress={() => webViewRef.current?.goForward()}
          disabled={!canGoForward}
        >
          <Feather name="chevron-right" size={24} color={canGoForward ? Colors.white : Colors.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.bottomBtn, pressed && { opacity: 0.5 }]}
          onPress={() => webViewRef.current?.reload()}
        >
          <Feather name="rotate-cw" size={20} color={Colors.textSecondary} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.bottomBtn, pressed && { opacity: 0.5 }]}
          onPress={() => router.back()}
        >
          <Feather name="home" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Angel overlay */}
      <AngelOverlay
        riskLevel={riskLevel}
        currentUrl={currentUrl}
        onGoBack={handleGoBack}
        onContinue={() => setAlertVisible(false)}
        onReport={handleReport}
        isAlertVisible={isAlertVisible}
        setAlertVisible={setAlertVisible}
      />

      {/* Toast */}
      <ToastMessage
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  urlBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  urlBarFocused: {
    borderColor: Colors.accent + "88",
    backgroundColor: "rgba(123,47,190,0.15)",
  },
  urlRiskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  urlInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.white,
    paddingVertical: 0,
  },
  goBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  riskBar: {
    height: 2,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  riskBarFill: {
    height: "100%",
    width: "100%",
  },
  webView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingScreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666",
  },
  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  errorIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.cardBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
    textAlign: "center",
    lineHeight: 26,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  openExternalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 8,
  },
  openExternalText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  goBackBtn: {
    paddingVertical: 12,
  },
  goBackText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: Colors.primaryLight,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  bottomBtn: {
    width: 48,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  bottomBtnDisabled: {
    opacity: 0.4,
  },
  webOnlyScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  webOnlyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 26,
    backgroundColor: "rgba(123,47,190,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 8,
  },
  webOnlyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    textAlign: "center",
  },
  webOnlyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  webOnlyUrlBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignSelf: "stretch",
  },
  webOnlyUrl: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    flex: 1,
  },
});
