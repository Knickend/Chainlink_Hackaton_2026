

## Address Book Feature

### Overview
Add a new "Contacts" tab in Settings where users can store contact information (name, email, wallet address) for people and companies. This makes it easy to reference saved contacts when sending transactions via the agent wallet.

### Database

Create an `address_book` table:
- `id` (uuid, primary key)
- `user_id` (uuid, not null)
- `name` (text, not null) -- person or company name
- `email` (text, nullable)
- `wallet_address` (text, nullable)
- `label` (text, nullable) -- optional tag like "friend", "company", "exchange"
- `notes` (text, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

RLS policies: users can only CRUD their own contacts (auth.uid() = user_id).

### Frontend Components

**1. New Settings tab: "Contacts"**
- Add a 5th tab in `Settings.tsx` between Security and Agent
- Update the grid from `grid-cols-4` to `grid-cols-5`

**2. `src/components/settings/AddressBookSection.tsx`**
- Card with a list of saved contacts showing name, email, and wallet address
- "Add Contact" button opens a dialog
- Each contact row has Edit and Delete actions
- Search/filter input at the top for quick lookup
- Empty state with a friendly message

**3. `src/components/settings/AddContactDialog.tsx`**
- Form with fields: Name (required), Email (optional), Wallet Address (optional), Label (optional dropdown: personal, company, exchange, other), Notes (optional)
- Zod validation for email format and wallet address format (0x... hex)
- Used for both Add and Edit flows

**4. `src/hooks/useAddressBook.ts`**
- React Query hook for CRUD operations on the `address_book` table
- `useQuery` to fetch all contacts for the current user
- `useMutation` for add, update, and delete with optimistic updates and toast notifications

### Technical Details

- Follows existing patterns from other settings sections (same Card/glass-card styling, motion animations)
- Uses existing UI components: Dialog, Input, Label, Button, Select
- Wallet address validation: optional but if provided must start with `0x` and be 42 characters
- Email validation: optional but if provided must be valid format via zod
- The contact list will be useful later for the "Send USDC" agent skill to suggest recipients

