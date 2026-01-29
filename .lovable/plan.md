
# Add Contact Email to Landing Page Footer

## Change Summary

Update the "Contact" link in the footer to use the company email address `InControl.Finance@proton.me` as a `mailto:` link instead of a placeholder `#` href.

## File to Modify

| File | Change |
|------|--------|
| `src/components/landing/Footer.tsx` | Update Contact link to use mailto with the email address |

## Implementation

Change the Contact anchor from:
```tsx
<a href="#" className="...">
  Contact
</a>
```

To:
```tsx
<a href="mailto:InControl.Finance@proton.me" className="...">
  Contact
</a>
```

This makes the Contact link functional - clicking it will open the user's default email client with the company email pre-filled as the recipient.
