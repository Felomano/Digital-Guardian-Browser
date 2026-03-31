import AsyncStorage from "@react-native-async-storage/async-storage";

const PROTECTED_CIRCLE_KEY = "angel_protected_circle";

export type ProtectedPerson = {
  id: string;
  email?: string;
  phone?: string;
  isActive: boolean;
};

export async function getProtectedCircle(): Promise<ProtectedPerson[]> {
  try {
    const raw = await AsyncStorage.getItem(PROTECTED_CIRCLE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProtectedPerson[];
  } catch {
    return [];
  }
}

export async function saveProtectedCircle(circle: ProtectedPerson[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PROTECTED_CIRCLE_KEY, JSON.stringify(circle));
  } catch (e) {
    console.error("Error saving protected circle:", e);
  }
}

export async function addProtectedPerson(person: Omit<ProtectedPerson, "id">): Promise<ProtectedPerson> {
  const circle = await getProtectedCircle();
  const newPerson: ProtectedPerson = {
    ...person,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  circle.push(newPerson);
  await saveProtectedCircle(circle);
  return newPerson;
}

export async function updateProtectedPerson(id: string, updates: Partial<ProtectedPerson>): Promise<void> {
  const circle = await getProtectedCircle();
  const index = circle.findIndex((p) => p.id === id);
  if (index >= 0) {
    circle[index] = { ...circle[index], ...updates };
    await saveProtectedCircle(circle);
  }
}

export async function removeProtectedPerson(id: string): Promise<void> {
  const circle = await getProtectedCircle();
  const filtered = circle.filter((p) => p.id !== id);
  await saveProtectedCircle(filtered);
}

export async function clearProtectedCircle(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROTECTED_CIRCLE_KEY);
  } catch (e) {
    console.error("Error clearing protected circle:", e);
  }
}
