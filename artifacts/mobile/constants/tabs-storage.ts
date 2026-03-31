import AsyncStorage from "@react-native-async-storage/async-storage";

const TABS_KEY = "angel_browser_tabs";

export type BrowserTab = {
  id: string;
  url: string;
  title: string;
  riskLevel: "safe" | "warning" | "danger" | "loading" | "unknown";
};

export async function getTabs(): Promise<BrowserTab[]> {
  try {
    const raw = await AsyncStorage.getItem(TABS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BrowserTab[];
  } catch {
    return [];
  }
}

export async function saveTabs(tabs: BrowserTab[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TABS_KEY, JSON.stringify(tabs));
  } catch (e) {
    console.error("Error saving tabs:", e);
  }
}

export async function addTab(url: string, title?: string): Promise<BrowserTab> {
  const tabs = await getTabs();
  const newTab: BrowserTab = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    url,
    title: title || url.replace(/^https?:\/\//, "").split("/")[0],
    riskLevel: "loading",
  };
  tabs.push(newTab);
  await saveTabs(tabs);
  return newTab;
}

export async function updateTab(id: string, updates: Partial<BrowserTab>): Promise<void> {
  const tabs = await getTabs();
  const index = tabs.findIndex((t) => t.id === id);
  if (index >= 0) {
    tabs[index] = { ...tabs[index], ...updates };
    await saveTabs(tabs);
  }
}

export async function removeTab(id: string): Promise<void> {
  const tabs = await getTabs();
  const filtered = tabs.filter((t) => t.id !== id);
  await saveTabs(filtered);
}

export async function clearTabs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TABS_KEY);
  } catch (e) {
    console.error("Error clearing tabs:", e);
  }
}
