# AI Coding Agent Instructions for CetecTimeLogger

## Project Overview

**CetecTimeLogger** is a React Native cross-platform mobile app (iOS/Android) for time logging, scaffolded with the latest React Native 0.83.1 and React 19.2.0. The codebase uses TypeScript, Hermes engine (Android), and CocoaPods (iOS).

**Key Tech Stack:**
- React Native 0.83.1 with New Architecture enabled
- React 19.2.0
- TypeScript 5.8.3
- Jest + React Test Renderer for testing
- Metro bundler (via `@react-native/metro-config`)
- Hermes JS engine (Android), Kotlin build system
- iOS: Swift-based AppDelegate, CocoaPods for deps

## Development Workflow

### Prerequisites
- **Node.js**: ≥20 (required)
- **Ruby**: ≥2.6.10 (for iOS CocoaPods)
- **iOS setup**: Run `bundle install` once, then `bundle exec pod install` after native dep changes
- **Android**: Requires Android SDK/NDK (see `android/gradle.properties`)

### Critical Commands

```bash
npm start                    # Start Metro bundler (always first)
npm run android              # Build & run Android app
npm run ios                  # Build & run iOS app
npm test                     # Run Jest tests
npm run lint                 # Run ESLint
bundle exec pod install      # Update CocoaPods (iOS only, after native changes)
```

**Dependency Installation**: When modifying dependencies:
- Always run `npm install` first
- For iOS native changes: run `bundle exec pod install` from project root
- For Android: Gradle handles it automatically

## Architecture & Key Files

### App Entry Points
- **`App.tsx`**: Root component using `SafeAreaProvider` for safe area handling and `NewAppScreen` template
- **`index.js`**: Metro entry point (unchanged from default)
- **`ios/CetecTimeLogger/AppDelegate.swift`**: iOS app initialization with React Native factory
- **`android/app/src/main/java/com/cetectimelogger/MainActivity.kt`**: Android activity extending ReactActivity

### Platform-Specific Configuration
- **`android/gradle.properties`**: Hermes engine enabled (`hermesEnabled=true`), Kotlin 2.1.20, NDK 27.1.12297006
- **`ios/Podfile`**: CocoaPods configuration (auto-generated, don't edit directly)
- **`app.json`**: App metadata (`name: "CetecTimeLogger"`, `displayName: "CetecTimeLogger"`)

### Build & Config Files
- **`metro.config.js`**: Default Metro config using `@react-native/metro-config`
- **`babel.config.js`**: Uses `@react-native/babel-preset`
- **`tsconfig.json`**: Extends `@react-native/typescript-config`, includes Jest types
- **`.eslintrc.js`**: Extends `@react-native` config
- **`.prettierrc.js`**: Single quotes, trailing commas, arrow parens avoided

## Testing & Quality

### Test Patterns
- **Test location**: `__tests__/` directory (e.g., `App.test.tsx`)
- **Testing library**: Jest + React Test Renderer
- **Test pattern**: Wrap renders in `ReactTestRenderer.act()` for state updates
- **Example** (`__tests__/App.test.tsx`): Basic snapshot-style test rendering the root App component

### Running Tests
```bash
npm test                     # Run all Jest tests
npm run lint                 # Check ESLint violations
```

## React Native Specific Patterns

### Safe Area Handling
The app uses `react-native-safe-area-context` (v5.5.2) to handle notches/safe areas:
- Wrap app in `<SafeAreaProvider>` at root
- Use `useSafeAreaInsets()` hook to get inset values
- Example in `App.tsx`: `AppContent` component extracts insets and passes to screen content

### Styling
- Use `StyleSheet.create()` for native-optimized styles (see `App.tsx`)
- Avoid inline styles for performance
- `useColorScheme()` hook available for dark/light mode detection

### Component Structure
- Functional components with hooks preferred
- Use `StatusBar` for status bar customization (e.g., bar style based on theme)
- Safe area insets should be applied to main container

## Common Tasks

### Adding New Components
1. Create `.tsx` file in appropriate directory
2. Use `StyleSheet.create()` for styles
3. Add Jest test in `__tests__/ComponentName.test.tsx`
4. Import and test with React Test Renderer

### Modifying Native Code
- **iOS**: Edit `ios/CetecTimeLogger/AppDelegate.swift` or native modules
  - After changes: Run `bundle exec pod install` and rebuild
- **Android**: Edit Kotlin files in `android/app/src/main/java/com/cetectimelogger/`
  - Gradle rebuilds automatically

### Fast Refresh
- On code save, Metro hot-reloads (powered by Fast Refresh)
- For state reset: Press R twice (Android) or R in Simulator (iOS)

## Important Gotchas & Conventions

1. **Hermes Engine**: Enabled on Android by default—affects debugger tools and some JS features
2. **New Architecture**: Enabled (`newArchEnabled=true` in `gradle.properties`)—use TurboModules for native communication
3. **CocoaPods Lock**: Always commit `ios/Podfile.lock` after `pod install`
4. **Node Version**: Enforce ≥20; build may fail silently on older versions
5. **Prettier Format**: Single quotes, trailing commas required (enforced by `.prettierrc.js`)
6. **No Yarn Lockfile**: Project uses npm only (`package-lock.json`)

## Debugging Tips

- **Android debugging**: Use Android Studio debugger or `adb logcat`
- **iOS debugging**: Use Xcode debugger or device console
- **Metro issues**: Kill Metro process, clear cache: `rm -rf node_modules/.cache`, restart
- **Pod issues**: Clear and reinstall: `rm -rf ios/Pods ios/Podfile.lock && bundle exec pod install`

## File Structure Reference

- `src/` (future): Component/feature directories expected here when code expands
- `__tests__/`: Jest test files (colocate with components or keep centralized)
- `android/`: Gradle-managed Android build
- `ios/`: Xcode-managed iOS build
- `.github/`: CI/CD and documentation (this file)



## Interaction points
### This app will connect with external services/APIs:
- User authentication (OAuth2) to an instance of CetecERP
- Time log data sync with CetecERP backend via REST API

The documentation for the Time log data Rest API can be found in starter/apidocs.json file in the project root. (this is an OpenAPI 3.0 spec file)
