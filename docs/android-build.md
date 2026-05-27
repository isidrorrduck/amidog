# Android build setup

This branch prepares Amidog for the first Android build with EAS Build.

## Expo app config

- Visible name: `Amidog`
- Slug: `amidog`
- Scheme: `amidog`
- Version: `0.1.0`
- Android package: `com.sgservice.amidog`
- Android version code: `1`
- Orientation: `portrait`
- App icon: `./assets/icon.png`
- Splash image: `./assets/splash.png`
- Adaptive icon foreground: `./assets/adaptive-icon.png`
- Web favicon: `./assets/favicon.png`

## Assets

All required asset files exist in this branch:

- `assets/icon.png`: PNG, 1024x1024 px.
- `assets/adaptive-icon.png`: PNG, 1024x1024 px, transparent foreground with safe area padding.
- `assets/splash.png`: PNG, 1024x1024 px, transparent centered splash mark.
- `assets/favicon.png`: PNG, 48x48 px.

The current assets are build-ready starter assets. Replace them later with final brand artwork using the same filenames, PNG format, and sizes.

## EAS profiles

`eas.json` defines:

- `preview`: internal Android APK for installable QA builds.
- `production`: Android App Bundle (`app-bundle`) for Play Console upload.

Build commands:

```bash
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform android --profile production
```

## Supabase environment variables

Do not commit `.env` or `.env.local`. They are ignored by Git.

Create these EAS environment variables for both `preview` and `production`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

These variables are read by client-side code through `process.env.EXPO_PUBLIC_*`, so they are bundled into the app and must be treated as public client configuration. Use EAS environment variables with `sensitive` or `plaintext` visibility, not `secret`, so Expo can inline them during the build.

Example:

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://your-project.supabase.co --environment production --visibility sensitive
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-supabase-anon-key --environment production --visibility sensitive
```

Repeat with `--environment preview` if preview uses a separate Supabase project.

## Native dependencies and Android permissions

Native Expo modules currently used:

- `expo-document-picker`: uses the Android system picker and does not require storage permissions for the current `getDocumentAsync` flow.
- `expo-notifications`: registers Expo push tokens and requests notification permission at runtime.

Android permissions declared in Expo config:

- `INTERNET`: required for Supabase, document URLs, and network API calls.
- `POST_NOTIFICATIONS`: required for notification permission prompts on Android 13+.

## Before the first production build

1. Run `eas login` if needed.
2. Run or let EAS run project setup so the Expo project is linked and `extra.eas.projectId` can be added.
3. Create the EAS environment variables above for `preview` and `production`.
4. Run the production build command and upload the resulting `.aab` to Play Console.
