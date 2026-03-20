# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) with Expo Router

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── mobile/             # Angel Browser - Expo mobile app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Angel Browser Mobile App

Located at `artifacts/mobile/`. A security-focused mobile browser with real-time threat detection.

### Features
- **LoginScreen** (`app/index.tsx`): Onboarding with angel shield logo
- **HomeScreen** (`app/home.tsx`): Dashboard with recent sites and stats
- **BrowserScreen** (`app/browser.tsx`): Full WebView browser with URL bar
- **AngelOverlay** (`components/AngelOverlay.tsx`): Floating security widget with color-coded halo
- **ToastMessage** (`components/ToastMessage.tsx`): Animated notification component
- **AngelIcon** (`components/AngelIcon.tsx`): Custom SVG angel shield icon

### Security API Integration
- Check security: `GET https://angelsecurity.base44.app/api/check-security?url=`
- Report scam: `POST https://angelsecurity.base44.app/api/report-scam`
- Risk levels: `safe` (green), `warning` (yellow), `danger` (red)

### Color Palette
- Primary: `#1A0B2E` (deep violet)
- Accent: `#7B2FBE` (medium violet)
- Safe: `#2ECC71` (green)
- Warning: `#F1C40F` (yellow)
- Danger: `#E74C3C` (red)

## TypeScript & Composite Projects

Every lib package extends `tsconfig.base.json` with `composite: true`. The root `tsconfig.json` lists all lib packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files; actual JS by esbuild/tsx/vite

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server. Routes in `src/routes/`, validation via `@workspace/api-zod`.

### `artifacts/mobile` (`@workspace/mobile`)
Expo React Native mobile app. Uses `react-native-webview` for browsing, `expo-linear-gradient` for UI, `react-native-svg` for icons.

### `lib/db` (`@workspace/db`)
Database layer using Drizzle ORM with PostgreSQL.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec + Orval codegen config.

### `lib/api-zod` (`@workspace/api-zod`)
Generated Zod schemas from OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)
Generated React Query hooks from OpenAPI spec.
