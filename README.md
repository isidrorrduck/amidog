# Amidog

Amidog es una plataforma multi-tenant para criadores de perros. Cada criador tendra su propio espacio o kennel para gestionar perros, camadas, cachorros, clientes, reservas, documentos y fotos.

Este repositorio contiene ahora una base limpia de Expo + React Native + TypeScript con navegacion inicial y configuracion preparada para Supabase.

## Stack

- Expo
- React Native
- TypeScript
- Expo Router
- Supabase
- NativeWind
- TanStack Query
- Zustand
- React Hook Form
- Zod

## Requisitos

- Node.js
- npm
- Expo Go, emulador o navegador para desarrollo web

## Instalacion

```bash
npm install
```

Crea un `.env` a partir de `.env.example` cuando tengas las credenciales de Supabase:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Desarrollo

```bash
npx expo start
```

Tambien puedes usar:

```bash
npm run android
npm run ios
npm run web
```

## Estructura principal

```text
app/
  _layout.tsx          # Layout raiz de Expo Router
  index.tsx            # Redireccion inicial a login
  auth/                # Login y registro
  (tabs)/              # Tabs principales: home y profile
  breeders/            # Ruta base de criadores
  dogs/                # Ruta base de perros
  litters/             # Ruta base de camadas
  bookings/            # Ruta base de reservas

src/
  components/          # Button, Input, Screen, Card
  lib/                 # env y cliente Supabase
  providers/           # TanStack Query provider
  features/            # Espacio reservado por dominio
  hooks/
  stores/
  types/
  utils/
```

## Scripts

```bash
npm run typecheck
npm run start
```

## Android build

La preparacion de la primera AAB Android con EAS Build esta documentada en `docs/android-build.md`.

## Pendiente

- Definir el modelo multi-tenant en Supabase.
- Implementar autenticacion real.
- Crear CRUD de breeders, dogs, litters y bookings.
- Anadir subida de documentos y fotos.
- Anadir validaciones y formularios reales con React Hook Form y Zod.
