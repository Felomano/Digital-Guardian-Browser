import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "angel_session";

export type Session = {
  loggedIn: boolean;
  method: "google" | "email";
  userId?: string;
  id?: string;
  name?: string;
  phone?: string;
  timestamp: string;
};

export async function getSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function saveSession(session: Omit<Session, "timestamp">): Promise<void> {
  await AsyncStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ ...session, timestamp: new Date().toISOString() })
  );
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
