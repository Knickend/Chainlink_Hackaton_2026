

# Fix Investment Strategy Preferences Dialog Styling

## Issues Identified

From the screenshots, there are two visual problems in the Investment Strategy Preferences dialog:

1. **Tooltip text invisible**: The pie chart tooltip has a dark background but no text color specified, resulting in dark text on a dark background (invisible)
2. **Legend overlapping chart**: The legend is positioned too close to the pie chart, with text slightly overlapping the chart area

## Root Cause Analysis

Looking at the current implementation in `InvestmentPreferencesDialog.tsx`:

| Issue | Current Code | Problem |
|-------|--------------|---------|
| Tooltip text color | Only `backgroundColor` and `border` are set | Missing `itemStyle` and `labelStyle` to set text color |
| Legend overlap | `ResponsiveContainer height={220}` with default legend position | Chart + legend competing for limited vertical space |

## Solution

### File to Modify
`src/components/InvestmentPreferencesDialog.tsx`

### Changes

**1. Fix Tooltip Styling (lines 219-225)**

Add `itemStyle` and `labelStyle` to ensure text is visible on the dark background:

```typescript
<Tooltip
  formatter={(value: number) => `${value}%`}
  contentStyle={{
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
  }}
  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
  labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
/>
```

**2. Fix Legend Overlap (lines 202-229)**

Increase the container height and position the legend outside the chart area:

```typescript
<ResponsiveContainer width="100%" height={280}>
  <PieChart>
    <Pie
      data={chartData}
      cx="50%"
      cy="40%"  // Move chart up to make room for legend
      innerRadius={50}
      outerRadius={80}
      paddingAngle={2}
      dataKey="value"
    >
      {/* cells */}
    </Pie>
    <Tooltip ... />
    <Legend 
      verticalAlign="bottom"
      wrapperStyle={{ paddingTop: '20px' }}
    />
  </PieChart>
</ResponsiveContainer>
```

## Visual Comparison

| Before | After |
|--------|-------|
| Tooltip: Dark background, invisible text | Tooltip: Dark background, light readable text |
| Legend: Overlaps bottom of pie chart | Legend: Clear separation below chart |

## Technical Details

- Uses CSS variables (`--popover-foreground`) for theme compatibility (works in both light and dark modes)
- Matches styling patterns used in `NetWorthChart.tsx` which correctly sets `labelStyle`
- Adjusts `cy="40%"` to shift the pie chart upward within the container
- Adds `wrapperStyle` padding to create visual separation between chart and legend

