import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Este archivo redirige a Expo hacia tu carpeta de artifacts
export function App() {
  const ctx = require.context('./artifacts/aura-app/app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
