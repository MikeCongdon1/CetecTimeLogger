# Component API Reference

## Reusable Components

### Badge

Status indicator with theme-aware coloring.

```tsx
<Badge label="In Progress" status="in_progress" />
```

**Props:**
- `label: string` - Badge text
- `status?: 'pending' | 'in_progress' | 'completed'` - Status type (affects color)
- `style?: ViewStyle` - Additional styles

**Colors by Status:**
- `pending`: Yellow/warning
- `in_progress`: Blue/primary
- `completed`: Green/success
- Default: Gray/muted

---

### SearchBar

Text input with optional filter button.

```tsx
<SearchBar
  placeholder="Search..."
  value={query}
  onChangeText={setQuery}
  onFilterPress={handleFilter}
/>
```

**Props:**
- `placeholder?: string` - Input placeholder text
- `value?: string` - Controlled input value
- `onChangeText?: (text: string) => void` - Text change callback
- `onFilterPress?: () => void` - Filter button press handler
- `style?: ViewStyle` - Additional styles

---

### TimerDisplay

Time display in HH:MM:SS format with visual progress indicator.

```tsx
<TimerDisplay hours={0} minutes={23} seconds={45} size="medium" />
```

**Props:**
- `hours: number` - Hour value (0-23)
- `minutes: number` - Minute value (0-59)
- `seconds: number` - Second value (0-59)
- `size?: 'small' | 'medium' | 'large'` - Display size (default: `'medium'`)
- `style?: ViewStyle` - Additional styles

**Features:**
- Auto-pads single digits (e.g., `5` → `05`)
- Visual progress bar on seconds column
- Responsive sizing

---

### IconButton

Icon-based button with multiple variants.

```tsx
<IconButton
  icon="⏸️"
  onPress={handlePress}
  size="large"
  variant="primary"
/>
```

**Props:**
- `icon: string` - Icon emoji/text (Unicode)
- `onPress: () => void` - Press handler
- `size?: 'small' | 'medium' | 'large'` - Button size (default: `'medium'`)
- `variant?: 'primary' | 'secondary' | 'ghost'` - Button style
- `disabled?: boolean` - Disable button
- `loading?: boolean` - Show loading spinner
- `style?: ViewStyle` - Additional styles

**Variants:**
- `primary`: Blue background with shadow, white icon
- `secondary`: Light background with border
- `ghost`: Transparent, minimal styling

---

### FilterChips

Horizontal scrollable filter selection component.

```tsx
<FilterChips
  chips={['All', 'Pending', 'In Progress']}
  selectedChip="All"
  onChipPress={setSelected}
/>
```

**Props:**
- `chips: string[]` - Array of filter options
- `selectedChip?: string` - Currently selected chip
- `onChipPress?: (chip: string) => void` - Selection handler
- `style?: ViewStyle` - Additional styles

**Features:**
- Horizontal scroll on overflow
- Theme-aware styling
- Single selection mode

---

### OrderCard

Individual order item with status badge and action button.

```tsx
<OrderCard
  order={order}
  onPress={() => console.log('selected')}
  onActionPress={() => console.log('play/pause')}
/>
```

**Props:**
- `order: Order` - Order data object
- `onPress?: () => void` - Card press handler
- `onActionPress?: () => void` - Action button press handler
- `style?: ViewStyle` - Additional styles

**Order Object:**
```tsx
interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  service: string;
  location: string;
  status: 'pending' | 'in_progress' | 'completed';
  elapsedTime?: { hours: number; minutes: number; seconds: number };
  isActive?: boolean;
}
```

**Visual States:**
- **Active** (`in_progress`): Blue left border
- **Pending**: Gray border
- **Completed**: Gray border with reduced opacity

---

### ActiveTimerCard

Large card displaying currently active order with timer.

```tsx
<ActiveTimerCard
  order={activeOrder}
  onPausePress={handlePause}
/>
```

**Props:**
- `order: Order` - Active order data
- `onPausePress?: () => void` - Pause button handler
- `style?: ViewStyle` - Additional styles

**Features:**
- Animated pulse indicator for active status
- Large pause button
- Integrated TimerDisplay
- Subtle background animation (blur effect)

---

## Screen Containers

### OrdersScreen

Main application screen showing orders list and active timer.

```tsx
<OrdersScreen
  onOrderPress={(order) => navigate('editor', order)}
  onCreateOrderPress={() => navigate('create')}
  onTimerPausePress={() => pauseTimer()}
/>
```

**Props:**
- `onOrderPress?: (order: Order) => void` - Order selection handler
- `onCreateOrderPress?: () => void` - Add order button handler
- `onTimerPausePress?: () => void` - Pause timer handler

**Features:**
- Header with menu, notifications, profile
- Active timer card
- Search input with filter button
- Status filter chips (All, Pending, In Progress, Completed)
- Scrollable orders list
- Bottom navigation bar with 5 tabs

**Mock Data:**
- 1 active order (in_progress)
- 3 inactive orders with various statuses

---

### CommentEditorScreen

Modal screen for editing time entry comments.

```tsx
<CommentEditorScreen
  contextData={{
    orderId: '4029',
    orderNumber: '4029',
    title: 'Smith Residence',
    elapsedTime: { hours: 0, minutes: 23, seconds: 45 },
  }}
  onSavePress={(comment, tags) => saveEntry(comment, tags)}
  onClosePress={() => goBack()}
/>
```

**Props:**
- `contextData: CommentContextData` - Order context information
- `onSavePress?: (comment: string, tags: string[]) => void` - Save handler
- `onClosePress?: () => void` - Close/back handler

**CommentContextData:**
```tsx
interface CommentContextData {
  orderId: string;
  orderNumber: string;
  title: string;
  elapsedTime: { hours: number; minutes: number; seconds: number };
}
```

**Features:**
- Context header showing order details
- Quick action tags (Meeting, Bug Fix, Travel, Review)
- Rich text input (300px min height)
- Character counter (500 max)
- Formatting toolbar (bold, italic, list, dictation)
- Save/close buttons

---

## Hooks & Utilities

### Colors

Design system color palette:

```tsx
import { Colors } from '../theme';

Colors.primary // '#137fec'
Colors.backgroundLight // '#f6f7f8'
Colors.backgroundDark // '#101922'
Colors.statusSuccess // '#10b981'
// ... and many more
```

### Spacing

Consistent spacing scale:

```tsx
import { Spacing } from '../theme';

Spacing.xs // 4
Spacing.sm // 8
Spacing.md // 12
Spacing.lg // 16
Spacing.xl // 20
```

### Typography

Pre-defined text styles:

```tsx
import { Typography } from '../theme';

const styles = StyleSheet.create({
  heading: Typography.headlineLarge,
  body: Typography.bodyMedium,
  label: Typography.labelSmall,
});
```

---

## Best Practices

### 1. Always handle optional callbacks
```tsx
onPress={onPress || (() => {})}
```

### 2. Use theme tokens consistently
```tsx
color: isDark ? Colors.textPrimaryDark : Colors.textPrimary
```

### 3. Wrap component state updates
```tsx
await ReactTestRenderer.act(() => {
  // setState calls
});
```

### 4. Apply safe area handling
```tsx
<SafeAreaView style={{ flex: 1 }}>
  {/* content */}
</SafeAreaView>
```

### 5. Test both light and dark modes
```tsx
useColorScheme() // returns 'light' | 'dark'
```
