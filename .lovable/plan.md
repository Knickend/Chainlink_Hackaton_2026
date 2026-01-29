

# Bug Reports & Feature Suggestions with Admin Dashboard

## Overview

I'll implement a complete feedback system that allows users to report bugs and suggest features, with a secure admin dashboard for tracking and managing all submissions.

---

## Architecture Summary

```text
+-------------------+     +------------------+     +------------------+
|   User Dashboard  | --> |  Feedback Table  | <-- |  Admin Dashboard |
|  (Report/Suggest) |     |   (Supabase DB)  |     |   (View/Manage)  |
+-------------------+     +------------------+     +------------------+
                                   ^
                                   |
                          +------------------+
                          |   User Roles     |
                          |  (Admin Check)   |
                          +------------------+
```

---

## Features

### For Users
- Floating feedback button (similar to the AI chat button)
- Form to submit bug reports or feature suggestions
- Category selection (bug/feature)
- Priority level for bugs
- Screenshot upload capability (optional, can add later)
- View submission history

### For Admins
- Dedicated admin dashboard at `/admin`
- View all submissions in a filterable table
- Filter by type (bug/feature), status, date, user
- Update status (new, in-progress, resolved, declined)
- Add internal notes
- Mark items as read/unread
- Analytics overview (total submissions, trends)

---

## Database Schema

### 1. Feedback Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Reference to the user who submitted |
| type | text | 'bug' or 'feature' |
| title | text | Brief summary |
| description | text | Detailed description |
| priority | text | 'low', 'medium', 'high', 'critical' (for bugs) |
| status | text | 'new', 'in_progress', 'resolved', 'declined' |
| admin_notes | text | Internal notes for admins |
| created_at | timestamp | When submitted |
| updated_at | timestamp | Last update time |

### 2. User Roles Table (following Supabase best practices)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Reference to auth.users |
| role | app_role enum | 'admin', 'moderator', 'user' |

---

## Technical Details

### Security

1. **Role-based access control** using a dedicated `user_roles` table (not storing roles on profiles)
2. **Security definer function** (`has_role`) to prevent RLS recursion
3. **RLS policies**:
   - Users can only view/create their own feedback
   - Admins can view/update all feedback
   - Only admins can access the admin dashboard

### Database Functions

```sql
-- Enum for roles
create type public.app_role as enum ('admin', 'moderator', 'user');

-- User roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

-- Feedback table
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null check (type in ('bug', 'feature')),
  title text not null,
  description text not null,
  priority text default 'medium',
  status text default 'new',
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Security definer function for role checking
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;
```

### New Files

| File | Purpose |
|------|---------|
| `src/components/FeedbackButton.tsx` | Floating button + dialog for submitting feedback |
| `src/pages/Admin.tsx` | Admin dashboard page |
| `src/components/admin/FeedbackTable.tsx` | Table displaying all submissions |
| `src/components/admin/FeedbackFilters.tsx` | Filter controls |
| `src/components/admin/FeedbackDetailDialog.tsx` | View/edit individual feedback |
| `src/components/admin/AdminStats.tsx` | Overview statistics cards |
| `src/hooks/useFeedback.ts` | Hook for feedback CRUD operations |
| `src/hooks/useUserRole.ts` | Hook to check user's admin status |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/admin` route |
| `src/pages/Index.tsx` | Add FeedbackButton component |

---

## Implementation Steps

1. **Database Setup**
   - Create `app_role` enum
   - Create `user_roles` table with RLS
   - Create `feedback` table with RLS
   - Create `has_role` security definer function
   - Set up appropriate RLS policies

2. **User Feedback Submission**
   - Create FeedbackButton component with floating action button
   - Create feedback submission dialog/form
   - Create useFeedback hook for database operations
   - Add button to main dashboard

3. **Admin Role Management**
   - Create useUserRole hook
   - Create protected route wrapper for admin pages

4. **Admin Dashboard**
   - Create Admin page with layout
   - Create FeedbackTable with sorting/filtering
   - Create detail view dialog for managing individual items
   - Create stats overview component

5. **Polish & UX**
   - Toast notifications for actions
   - Loading states
   - Empty states
   - Responsive design

---

## Assigning Admin Role

After implementation, you can assign admin role to specific users via the database:

```sql
-- Replace with actual user_id
INSERT INTO user_roles (user_id, role) 
VALUES ('user-uuid-here', 'admin');
```

---

## Estimated Components

- ~8 new files
- ~2 modified files
- 1 database migration (tables, functions, RLS policies)

