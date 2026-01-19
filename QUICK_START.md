# Quick Start Guide

## Running the App

```bash
# Start Metro bundler
npm start

# In a new terminal, run on Android
npm run android

# Or run on iOS
npm run ios
```

## Project Structure Overview

The app is organized into a clean, modular architecture:

### `src/theme/`
Design system configuration (colors, spacing, typography). All components use these tokens for consistency.

### `src/types/`
TypeScript interfaces for Orders, Comments, and related data structures.

### `src/components/`
Reusable UI components that follow React Native best practices:
- **Badge**: Status indicator
- **SearchBar**: Search input with filter button
- **TimerDisplay**: HH:MM:SS timer display
- **IconButton**: Icon-based buttons with variants
- **FilterChips**: Horizontal scrollable filter options
- **OrderCard**: Individual order display
- **ActiveTimerCard**: Large active order card

### `src/containers/`
Full-screen feature modules:
- **OrdersScreen**: Main orders list with active timer
- **CommentEditorScreen**: Modal for editing time entry comments

## Current Flow

1. App opens to **OrdersScreen**
   - Shows list of orders with status
   - Active timer card for current order
   - Search and filter functionality
   - Bottom navigation bar

2. Tap order → Navigate to **CommentEditorScreen**
   - Edit comment/time entry notes
   - Add quick tags (Meeting, Bug Fix, Travel, Review)
   - Save to update order

3. Save → Return to OrdersScreen

## Next Development Steps

### 1. Connect to API
Replace mock data in `OrdersScreen.tsx` with real API calls:

```tsx
// Get orders from CetecERP API
const [orders, setOrders] = useState<Order[]>([]);

useEffect(() => {
  fetchOrders().then(setOrders);
}, []);
```

### 2. Add State Management
Consider implementing Redux, Zustand, or Context API for:
- Current active order
- User authentication
- Orders cache
- Navigation state

### 3. Implement Real Timer
Add native timer with background support:
```tsx
// Use react-native-background-timer for background execution
// Store elapsed time in persistent storage
```

### 4. Add Navigation
Implement React Navigation for screen transitions:
```bash
npm install @react-navigation/native @react-navigation/bottom-tabs
```

### 5. Add Authentication
Implement OAuth2 flow for CetecERP login

## Testing

Run test suite:
```bash
npm test
```

Add new tests in `__tests__/` directory following the example pattern.

## Dark Mode

All components automatically support dark mode. Test on both themes:
- Light: `Colors.backgroundLight`
- Dark: `Colors.backgroundDark`

## Styling

Use the design tokens in `src/theme/`:

```tsx
import { Colors, Spacing, Typography } from '../theme';

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    backgroundColor: Colors.backgroundLight,
  },
  text: {
    ...Typography.titleMedium,
  },
});
```

## Component Patterns

### Color Scheme Support
```tsx
const isDark = useColorScheme() === 'dark';
// Use isDark to conditionally apply colors
```

### Safe Area Insets
```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();
// Apply to padding/margin
```

### Optional Props Handling
```tsx
// Always provide fallback for optional callbacks
onPress={onPress || (() => {})}
```

## Resources

- [React Native Docs](https://reactnative.dev/)
- [Project Architecture](./ARCHITECTURE.md)
- [TypeScript Errors?](https://www.typescriptlang.org/docs/)
- [Tailwind Colors Reference](https://tailwindcss.com/docs/customizing-colors) (color palette based on Tailwind)
