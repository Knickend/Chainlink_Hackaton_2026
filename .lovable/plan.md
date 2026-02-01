

# Add Screenshot Uploads to Feedback Form

## Overview
This feature will allow users to attach screenshots when submitting bug reports or feature suggestions. Screenshots are especially valuable for bug reports as they help admins visualize the issue.

## Current State
- The feedback form collects: type (bug/feature), title, description, and priority
- No file upload capability exists
- No storage bucket is configured for feedback attachments
- The feedback table in the database has no column for storing attachment references

## What Will Be Built

### For Users
- An "Attach Screenshot" button in the feedback dialog
- Ability to upload up to 3 images (PNG, JPG, WEBP)
- Preview of attached images before submission
- Option to remove attachments before submitting

### For Admins
- View attached screenshots in the feedback detail dialog
- Click to expand images in a lightbox view

---

## Technical Implementation

### 1. Database Changes

**Create a storage bucket** for feedback attachments:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', false);
```

**Add RLS policies** so users can upload their own files and admins can view all:
- Users can upload files to their own folder
- Users can view their own uploads
- Admins can view all uploads

**Add a column** to the feedback table to store attachment URLs:
```sql
ALTER TABLE public.feedback 
ADD COLUMN attachments text[] DEFAULT '{}';
```

**Update the feedback_user_view** to include the new attachments column.

### 2. Frontend Changes

**Update FeedbackButton.tsx:**
- Add file input with drag-and-drop support
- Show image previews with remove option
- Upload files to storage before submitting feedback
- Pass attachment URLs to the submit function

**Update useFeedback.ts:**
- Add `uploadAttachment` function to handle file uploads
- Update `submitFeedback` to accept attachment URLs
- Update types to include attachments array

**Update feedback.types.ts:**
- Add `attachments` field to Feedback interface
- Add `attachments` to FeedbackInsert interface

**Update FeedbackDetailDialog.tsx:**
- Display attached images in a grid
- Add lightbox functionality to view full-size images

### 3. Security Considerations

- Files are stored in a **private bucket** (not publicly accessible)
- RLS policies ensure:
  - Users can only upload to their own folder (`user_id/filename`)
  - Users can only view their own attachments
  - Admins can view all attachments
- File type validation (images only)
- File size limit (max 5MB per file)
- Maximum 3 attachments per feedback submission

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/lib/feedback.types.ts` | Add `attachments` field to types |
| `src/hooks/useFeedback.ts` | Add upload function, update submit logic |
| `src/components/FeedbackButton.tsx` | Add file upload UI with previews |
| `src/components/admin/FeedbackDetailDialog.tsx` | Display attachments with lightbox |
| Database migration | Create bucket, RLS policies, add column |

