

## Optimize Expenses Section: Tabbed Filters + Compact Upcoming Agenda

### Problem

From the screenshot:
- The **Expenses card** tries to show 18 items (10 recurring + 8 non-recurring) in a tiny 180px scrollable list, making it hard to find specific entries
- The **Upcoming Expenses card** takes up a full-width row for just 1 item, wasting vertical space
- Information density is poor -- too much scrolling in the expense list, too much whitespace in upcoming

### Solution

**1. Add filter tabs to the Expenses card**

Replace the flat expense list with tab-based filtering so users can focus on what matters:
- **All** (default) -- shows all current-month expenses
- **Recurring** -- only recurring expenses  
- **One-time** -- only non-recurring expenses for this month

This uses small pill/toggle buttons below the stats grid. The item count updates dynamically with the filter.

**2. Merge Upcoming Expenses into the Expenses card**

Instead of a separate full-width card, add **"Upcoming"** as a fourth filter tab in the Expenses card. When selected, it shows future non-recurring expenses with their date badges -- exactly what the standalone card shows today, but inline.

This eliminates the standalone `UpcomingExpensesCard` from the layout and saves an entire dashboard row.

**3. Add an upcoming count indicator**

Show a small badge/count next to the "Upcoming" tab so users always know if planned expenses exist, even when viewing other filters.

---

### Files Changed

**`src/components/IncomeExpenseCard.tsx`**
- Add a `filter` state: `'all' | 'recurring' | 'one-time' | 'upcoming'` (only for expense type)
- Render small toggle buttons below the stats grid when `type === 'expense'`
- Filter the displayed items based on the active tab
- For "upcoming" tab, filter to `!is_recurring && expense_date > today`
- For "one-time" tab, filter to `!is_recurring && expense_date <= today` (current month only)
- Accept new props: `allExpenses` (unfiltered list for upcoming tab) so the card can show future items too
- Increase `max-h` from 180px to 220px to give slightly more room per filter view

**`src/pages/Index.tsx`**
- Remove the standalone `<UpcomingExpensesCard>` section (lines 685-694)
- Pass the full `expenses` array to the expense `IncomeExpenseCard` via a new `allExpenses` prop so it can compute the "upcoming" filter internally

**`src/components/UpcomingExpensesCard.tsx`**
- No changes needed (kept for potential reuse), but no longer rendered on the dashboard

---

### Technical Details

Filter logic inside `IncomeExpenseCard` (expense type only):

```text
const today = new Date().toISOString().slice(0, 10);

Filters:
- "all":       items as passed (current month expenses from usePortfolio)
- "recurring": items.filter(e => e.is_recurring)
- "one-time":  items.filter(e => !e.is_recurring)
- "upcoming":  allExpenses.filter(e => !e.is_recurring && e.expense_date > today)
```

Filter UI: Small pill buttons rendered in a flex row, using existing Badge/toggle styling to match the glassmorphism theme. The active filter gets a filled background; inactive filters are outlined.

The stats grid updates to reflect the filtered view -- showing count and total for the active filter rather than always showing the full breakdown.

