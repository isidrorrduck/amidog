# Amidog

Amidog es una plataforma multi-tenant para criadores de perros y sus clientes/dueños. Cada criador gestiona su propio espacio (kennel) con perros, camadas, cachorros, reservas, documentos y fotos. Los dueños de mascotas pueden acceder a la información de sus animales y gestionar reservas.

## Stack utilizado

- Expo + React Native + TypeScript
- Expo Router
- Supabase (base de datos PostgreSQL, autenticación, almacenamiento y realtime)
- NativeWind (estilos tipo Tailwind para React Native)
- TanStack Query (gestión de datos y caché)
- Zustand (estado local sencillo)
- React Hook Form + Zod (formularios y validación)

## Estructura de carpetas

```
app/                # Rutas y pantallas de Expo Router
  (auth)/           # Pantallas de autenticación
  (tabs)/           # Pestañas principales
  breeders/         # Screens para criadores
  dogs/             # Screens para perros
  litters/          # Screens para camadas
  bookings/         # Screens para reservas

src/
  components/       # Componentes UI reutilizables
  features/         # Lógica de dominio (auth, breeders, dogs, etc.)
  hooks/            # Hooks personalizados
  lib/              # Inicialización de Supabase y variables de entorno
  stores/           # Zustand stores
  types/            # Tipos y modelos
  utils/            # Utilidades

supabase/
  migrations/       # Migraciones y seeds de base de datos
  seed.sql          # Script de seeds (pendiente de completar)

assets/             # Assets estáticos
```

## Instalación

1. Clona este repositorio:

```bash
git clone https://github.com/isidorrduck/amidog.git
cd amidog
```

2. Instala las dependencias:

```bash
npm install
```

3. Instala la CLI de Expo (si no la tienes):

```bash
npm install -g expo-cli
```

4. Crea un archivo `.env` en la raíz del proyecto con las variables de entorno de Supabase:

```
EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

5. Inicia el proyecto en modo desarrollo:

```bash
npx expo start
```

Luego podrás escanear el QR con la app de Expo Go en tu móvil para probar la aplicación.

## Configuración de Supabase

Crea un proyecto en Supabase y copia:

- `EXPO_PUBLIC_SUPABASE_URL`: URL del proyecto
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: clave anónima

El esquema de base de datos y las políticas RLS se definen en el archivo `supabase/migrations/` y se ejecutan a través del panel de SQL en Supabase.

## Próximos pasos

- Completar la implementación de las pantallas y componentes.
- Crear las funciones de negocio para gestionar criadores, perros, camadas y reservas.
- Añadir pruebas unitarias y de integración.
- Integrar notificaciones push y subida de fotos.
