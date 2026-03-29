# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Strutture gestite

Il gruppo comprende 7 strutture alberghiere a Napoli:
**SoulArt Hotel**, **Boutique**, **San Liborio**, **Principe**, **Mastrangelo**, **Art Resort**, **Santa Brigida**.

## Risposte alle recensioni Booking.com

- **Firma in italiano:** `Paolo P. - Quality Manager`
- **Firma in inglese:** `Best regards. Paolo P. - Quality Manager`
- Non ripetere le parole esatte usate dal recensore.
- Includere sempre un incentivo alla prenotazione futura.

## Project Overview

**QM Dashboard** is a single-file, self-contained hotel Quality Management dashboard for a multi-property hotel group in Naples. The entire application lives in one HTML file: `hotel_qm_dashboard_v185.html` (~5,255 lines, ~427 KB). There is no build system, no package manager, and no compilation step.

## Development

To use the app, simply open `hotel_qm_dashboard_v185.html` in a browser. All changes are made directly to this file. No build, install, or lint commands exist.

When making significant changes, increment the version number in the filename and in the `<title>` tag (e.g., `v185` → `v186`).

## Architecture

The app is a vanilla JS SPA with a sidebar nav and a main content area that swaps views via `setView(id, navEl)`. All state is held in global variables and persisted to `localStorage`, with optional sync to Cloudflare KV.

### Key Globals

```js
DEPTS       // Staff rosters: fo (Front Office), hk (Housekeeping), bkf (Breakfast), mt (Maintenance)
REV_HOTELS  // 7 hotels: sa, bh, sl, pr, ms, ar, sb
TASK_STATE  // Checklist/task progress
HKP_DATA    // Housekeeping room data
IS_REST     // Shift "rest/off" identifier ('R')
```

### 16 Views

Navigation between: `overview`, `registrazione`, `checklist`, `reclami`, `recensioni-{hotel}` (×7), `audit`, `bkfsheet-{hotel}` (×2), `hkp-{hotel}` (×2), `miniapp`.

### Storage & Sync

- **Primary**: `localStorage` — all data read/written here on every change
- **Secondary**: Cloudflare KV via proxy at `https://anthropic-proxy.qm-d82.workers.dev` — cloud sync between devices; status shown in topbar
- **External**: Google Sheets API — housekeeping and breakfast data fetched on demand

### AI Integration

Claude API is called via the same Cloudflare proxy:
- Model: `claude-sonnet-4-20250514`
- Used to parse PDFs/images of shift schedules, guest arrivals, and meal documents into structured JSON
- Prompts are inline in the JS; look for `fetch('https://anthropic-proxy...')` calls

### Initialization Sequence

On `DOMContentLoaded` (~line 2752):
1. Set current date display
2. Build KPI bar chart
3. Async pull from Cloudflare KV (cloud sync)
4. Restore all localStorage state: checklist, complaints, audits, custom tasks, weekly shifts, arrivals, reviews, HKP data, cleaning/meals

### Review Scoring Formula

Reviews use a weighted average: **85% current year / 10% year-2 / 5% year-3**, with a 271-day decay factor for expiration tracking.

### Hotel Room Detection Logic

Room numbers determine which hotel a record belongs to:
- `Art` prefix → Art Resort
- `200–299` → Boutique Hotel
- (and so on per property)

### CSS Design Tokens

All colors/spacing use CSS variables defined at the top of the `<style>` block:
```css
--bg: #E8E8EA      /* page background */
--surface: #F4F4F6 /* card surfaces */
--accent: #1E4080  /* primary blue */
--green: #1E7A48
--red: #C0352A
--amber: #A05A00
```
