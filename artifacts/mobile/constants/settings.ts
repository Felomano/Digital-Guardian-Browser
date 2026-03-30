import AsyncStorage from "@react-native-async-storage/async-storage";

export const SETTINGS_KEY = "angel_settings";

export type AngelSettings = {
  hideHaloOnGreen: boolean;
};

export async function loadSettings(): Promise<AngelSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { hideHaloOnGreen: false };
    return { hideHaloOnGreen: false, ...JSON.parse(raw) };
  } catch {
    return { hideHaloOnGreen: false };
  }
}

export async function saveSettings(settings: AngelSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
