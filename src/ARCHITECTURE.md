# CetecTimeLogger Component Architecture

## Directory Structure

```
src/
├── theme/              # Design system & styling
│   ├── colors.ts       # Color palette
│   ├── spacing.ts      # Spacing units
│   ├── typography.ts   # Text styles
│   └── index.ts        # Theme exports
├── types/              # TypeScript types & interfaces
│   ├── order.ts        # Order-related types
│   ├── comment.ts      # Comment-related types
│   └── index.ts        # Type exports
├── components/         # Reusable UI components
│   ├── Badge.tsx       # Status badge component
│   ├── SearchBar.tsx   # Search input with filter
│   ├── TimerDisplay.tsx # HH:MM:SS timer display
│   ├── IconButton.tsx  # Icon-only button component
│   ├── FilterChips.tsx # Horizontal filter chips
│   ├── OrderCard.tsx   # Individual order card
│   ├── ActiveTimerCard.tsx # Large active timer card
│   └── index.ts        # Component exports
└── containers/         # Feature screens
    ├── OrdersScreen/        # Orders list & active timer
    │   ├── OrdersScreen.tsx
    │   └── index.ts
    └── CommentEditorScreen/ # Comment/time entry editor
        ├── CommentEditorScreen.tsx
        └── index.ts
```

## Design Tokens

### Colors
- **Primary**: `#137fec` (Blue)
- **Background Light**: `#f6f7f8`
- **Background Dark**: `#101922`
- **Surface Light**: `#ffffff`
- **Surface Dark**: `#1c2b36`

### Spacing
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 20px
- `2xl`: 24px

### Typography
- Display, Headline, Title, Body, Label sizes with consistent line heights
- Mono font for timer displays

## Component Overview

### Reusable Components

#### Badge
Status indicator with conditional styling
```tsx
<Badge label="In Progress" status="in_progress" />
```

#### SearchBar
Search input with optional filter button
```tsx
<SearchBar
  placeholder="Search..."
  value={query}
  onChangeText={setQuery}
  onFilterPress={handleFilter}
/>
```

#### TimerDisplay
HH:MM:SS display with visual progress on seconds
```tsx
<TimerDisplay hours={0} minutes={23} seconds={45} size="medium" />
```

#### IconButton
Icon-based button with variants
```tsx
<IconButton
  icon="⏸️"
  onPress={handlePause}
  size="large"
  variant="primary"
/>
```

#### FilterChips
Horizontal scrollable filter options
```tsx
<FilterChips
  chips={['All', 'Pending', 'In Progress']}
  selectedChip="All"
  onChipPress={setFilter}
/>
```

#### OrderCard
Single order item with status and action button
```tsx
<OrderCard
  order={order}
  onPress={handleSelectOrder}
  onActionPress={handlePlayPause}
/>
```

#### ActiveTimerCard
Large card showing currently active order and timer
```tsx
<ActiveTimerCard
  order={activeOrder}
  onPausePress={handlePause}
/>
```

### Screen Containers

#### OrdersScreen
Main app screen with:
- Header with menu, notifications, and profile
- Active timer card
- Search bar
- Filter chips
- Orders list (with mock data)
- Bottom navigation

#### CommentEditorScreen
Modal screen for editing time entry comments with:
- Context card showing order details
- Quick action tags
- Rich text input (formatted)
- Character counter
- Formatting toolbar (bold, italic, list, etc)

## State Management

Currently uses React component state. For production:
- Consider adding Redux, Zustand, or Context API for global state
- Implement proper data fetching from CetecERP API
- Add offline sync capabilities

## Testing

Test files are in `__tests__/` directory with React Test Renderer:
- `Badge.test.tsx`
- `TimerDisplay.test.tsx`
- `OrderCard.test.tsx`

Run tests with:
```bash
npm test
```

## Dark Mode Support

All components automatically adapt to dark mode using `useColorScheme()` hook. Test on both light and dark themes.

## Next Steps

1. **Connect to API**: Replace mock order data with real API calls
2. **Add Navigation**: Implement React Navigation for screen transitions
3. **Add State Management**: Integrate Redux/Zustand for global state
4. **Add Real Timer Logic**: Implement native timer with background support
5. **Implement Authentication**: Add OAuth2 flow for CetecERP login
6. **Add Maps Integration**: Show location on map view
7. **Add History Screen**: Track time entries over time
8. **Add Settings Screen**: User preferences and app configuration
