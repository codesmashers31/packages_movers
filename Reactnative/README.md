# Local Movers — mobile UI

An Expo / React Native mobile design inspired by Zepto's compact service discovery and Zomato's clear cards and navigation, with an original moving-service identity. Based on `../documents/01-project-scope.md` through `04-delivery-and-ux-plan.md`.

## Start on Android

```powershell
cd E:\mynewprojectswithstu\packagemovers\Reactnative
npm ci
npm run android
```

`npm run android` uses **Expo CLI → native Android project → Gradle → emulator/device** (`expo run:android`). Install Android Studio's SDK tools and a compatible JDK, set `ANDROID_HOME`, then start an emulator or connect a phone with USB debugging enabled. `adb devices` should list it. The first native build downloads Gradle and any required Android SDK/NDK packages.

For subsequent JavaScript and styling edits, use `npm start`. For Expo Go, install a version supporting SDK 57 and use `npm run android:go`; use the native development build when Expo Go does not support your SDK. Rebuild after changing native dependencies or app configuration.

If an all-architecture build uses too much memory, an optional emulator-only check is:

```powershell
npm run prebuild:android
cd android
$env:NODE_ENV='development'
.\gradlew.bat :app:assembleDebug --no-daemon --max-workers=2 '-PreactNativeArchitectures=x86_64' '-Dorg.gradle.parallel=false'
```

This targets an x86_64 emulator. Use `npm run android` with the intended device for its native architecture.

```powershell
npm run prebuild:android   # Generate Android project without launching
npm run web               # Phone-width browser preview, not a desktop product
npm run typecheck
npm test
npm run test:ui            # Automated 390/360px browser checks, uses Edge
npm run check
npx expo-doctor
npx expo export --platform android --platform web --max-workers 2
```

Node 22.18+ or a compatible newer Node version is needed for the TypeScript-based Node tests. The current workspace uses Node 26.

Browser checks use a separate headless Edge test session. For Chrome, set `$env:PLAYWRIGHT_CHANNEL='chrome'`. Screenshots are written to `artifacts/`.

## Styling versions

| Package | Version |
| --- | --- |
| Expo | SDK 57, `~57.0.25` |
| React Native | `0.86.3` |
| React | `19.2.3` |
| NativeWind | `5.0.0-rc.0` |
| react-native-css | `3.1.0-rc.0` |
| Tailwind CSS / PostCSS plugin | `4.1.12` |
| lightningcss | `1.30.1`, pinned override |

**Tailwind v4 and NativeWind v4 are different version numbers.** NativeWind v4 uses Tailwind v3. This project uses the NativeWind v5 release candidate to meet the Tailwind v4 requirement. It is a prerelease dependency, so production adoption requires native-device testing. Keep the NativeWind/engine pair pinned and commit the lockfile.

The CSS-first theme is in `global.css`. Metro uses `withNativewind`, PostCSS uses `@tailwindcss/postcss`, and Babel uses only `babel-preset-expo`. Do not add the NativeWind v4 Babel preset or a v3 Tailwind configuration.

References: [NativeWind v5 installation](https://www.nativewind.dev/v5/getting-started/installation), [Expo local app development](https://docs.expo.dev/guides/local-app-development/).

## Design and implemented interactions

- Email-only login and registration UI: name/email registration, six-digit OTP entry, change email, resend cooldown, expiry, validation and logout. No phone, password or social login.
- **Local UI demo only:** register first, then use the visible preview code **123456**. No email is sent and email ownership is not verified. Profiles and the active session persist through AsyncStorage (browser preview uses localStorage). This is not production authentication and stores no server credentials or tokens. Clearing app data removes the local accounts.
- Returning local accounts can log in with email and the same preview code. Each profile has its own locally saved moving draft and demo booking. Signing out retains that profile’s plans for the next local login.
- Home: locality picker, searchable service categories, moving illustration, draft entry, preparation guide.
- Move planner: pickup/drop-off → home/date/access → item counters/notes → services → review.
- Quote comparison: illustrative itemized prices, inclusions/exclusions, sorting and selection.
- Demo booking: immutable copy of the selected draft and quote, illustrative future milestones.
- My Moves, Updates and Profile tabs, contextual moving checklist, worker preview.
- Worker preview: accept a sample assignment and advance through ordered steps; completion remains with the customer.
- Local draft and latest demo booking persist on the device using AsyncStorage. Saving a new demo booking replaces the previous demo plan. Drafts contain addresses: use fictional details during review. The moving checklist and worker simulation are session-only.

Visual language: violet `#6125C5`, coral `#F46055`, warm pastel service cards, dark plum text, Manrope fonts, large rounded cards, and lime primary hero action. Touch controls target at least 44 dp, screens use safe-area insets, long content scrolls, and the form handles the keyboard. Fonts and SVG artwork ship locally.

## Working process from here

1. Review this mobile UI on 360–430 dp phones, including large font settings and keyboard behavior. Confirm brand name, launch city and languages.
2. Replace the local email/OTP preview with server-verified email authentication, secure session storage and server-authorized customer/worker membership.
3. Connect catalog, coverage validation, request revisions, custom inventory and private photo uploads.
4. Replace example quotes with authorized vendor offers, expiry checks, full terms and immutable acceptance snapshots.
5. Add server-confirmed payments, assignments, milestones, delivery proof, cancellation and support.
6. Test authorization, duplicate submissions, offline reconciliation, payment failures and the complete customer/worker journey before a pilot.

This is a functional **UI preview**, not a live marketplace. The API client is not called by these screens. Email OTP is explicitly a local demo. No coverage, vendor verification, real ratings, GPS tracking, payment, messaging or real booking creation is simulated as live. Business rules marked undecided in the source documents remain undecided.

## Verification

- TypeScript check: passed.
- Request validation, itemized quote and native 44dp touch-target checks: 7 passed.
- Phone browser checks: 5 passed, covering email registration/login/logout, OTP validation/expiry/resend, session persistence, account-specific drafts, full demo booking journey, worker entry, locality selection, search and 360px overflow.
- Expo Doctor: 21/21 passed.
- Android prebuild and Android / web production bundle exports: passed.
- Native Android x86_64 debug APK assembly: passed (`android/app/build/outputs/apk/debug/app-debug.apk`).
- Visual review screenshots: `artifacts/login-mobile.png`, `artifacts/register-mobile.png`, `artifacts/otp-mobile.png`, `artifacts/home-mobile.png` and `artifacts/quotes-mobile.png`.

## Structure

```text
App.tsx                      Fonts, safe area, app providers
global.css                   Tailwind v4 theme
src/components/              Shared UI and local vector illustration
src/navigation/              Customer tabs and native stack
src/screens/                 Customer and worker mobile screens
src/data/moving.ts           Sample catalog, quotes and validation
src/state/MoveContext.tsx    Local preview state and persistence
src/state/AuthContext.tsx    Device-local email/OTP preview and saved session
tests/moving.test.mjs        Request validation and quote total tests
```

Native folders are generated by Expo prebuild. Keep native customization in app config/config plugins; do not use `prebuild --clean` over manual native changes without reviewing them.

Dependency audit currently reports moderate transitive advisories through Expo's Xcode tooling and its `uuid` dependency. No high or critical advisories were reported. Do not use `npm audit fix --force`: its proposed major downgrades conflict with this Expo/NativeWind setup. Recheck upstream fixes before release.
