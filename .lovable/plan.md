

# Update Privacy Policy Page

## Overview

Update the Privacy Policy page to reflect new content emphasizing that InControl is a standalone portfolio tracker with NO financial data stored on servers. The update includes restructured sections, a third-party services table, GDPR legal basis references, and updated company information (Estonia instead of Spain).

## Key Changes Summary

| Section | Current | Updated |
|---------|---------|---------|
| Effective Date | January 30, 2026 | February 1, 2026 |
| Introduction | Generic privacy commitment | Emphasizes NO financial data on servers |
| Data We Collect | Basic list | Highlights manual entry, NO bank/exchange integrations, LOCAL storage |
| How We Use Data | Bullet list | Concise with GDPR Article references |
| Data Storage | Detailed list | Simplified: EU servers, TLS, local data |
| Third Parties | Bullet list | Formatted table with privacy links |
| GDPR Rights | Detailed explanations | Concise single line |
| Cookies | No opt-out mention | Mentions analytics opt-out |
| Data Controller | Madrid, Spain | Estonia e-Business Registry |
| Section Order | 10 sections + controller box | 10 sections (controller integrated as section 9) |

## Detailed Section Updates

### Section 1: Introduction
- Add emphasis: "NO financial data stored on servers"
- Describe as "Standalone portfolio tracker"

### Section 2: Data We Collect  
- Emphasize data is "manually entered"
- Add prominent callouts:
  - NO integrations with financial APIs, banks, or exchanges
  - Data stored LOCALLY in browser/device only
  - We NEVER receive financial account information

### Section 3: How We Use Data
- Simplify to single line: "Provide service, process payments, improve product"
- Add GDPR legal basis: Contract (Art. 6(1)(b)), Legitimate interest (Art. 6(1)(f))

### Section 4: Data Storage & Security
- Simplify to: "EU servers (Supabase). TLS encrypted. Local portfolio data."

### Section 5: Third Parties
- Convert to styled table with 3 columns: Service, Purpose, Privacy Link
- Include: Supabase (Auth/DB), Stripe (Payments), CoinGecko (Prices)
- Add actual clickable links to each service's privacy policy

### Section 6: Your GDPR Rights
- Condense to single line listing rights
- Keep contact email

### Section 7: Cookies
- Add mention of analytics opt-out availability

### Section 8: Retention
- Reformat: "Account active: Indefinite. Deletion: 30 days permanent."

### Section 9: Data Controller (moved from bottom box)
- Update to: InControl.finance OU, Estonia e-Business Register
- Keep contact email
- Note: User may need to add registry number

### Section 10: Changes
- Keep: "30 days email notice"

## Technical Implementation

### File to Modify
- `src/pages/Privacy.tsx`

### Changes Required
1. Update effective date from "January 30, 2026" to "February 1, 2026"
2. Rewrite all 10 sections with new condensed content
3. Add HTML table styling for third-party services section
4. Remove the separate "Data Controller" box at the bottom (integrated into section 9)
5. Update company location from "Madrid, Spain" to "Estonia e-Business Register"

### Styling Considerations
- Use existing Tailwind classes for consistency
- Add a proper table component for third-party services with borders and padding
- Keep bold/emphasis styling for important disclaimers (NO financial data, LOCAL storage)
- External links will open in new tabs with proper security attributes

