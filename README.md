# CRM Workspace

Local CRM-style workspace for the collected leads.

## What it does
- loads the consolidated lead master JSON
- shows a lead list with filters
- lets you click Instagram, website, booking, phone, or email when available
- stores CRM state locally in the browser (`localStorage`)
- supports notes, statuses, follow-up dates, and a simple pipeline board

## Files
- `index.html`
- `styles.css`
- `app.js`

## Run it
Simplest option from `instagram-lead-finder`:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/crm/
```

## Data source
Current app reads from:
- `../ops/wave-003-riga-solo-women-ig-first/master/leads.master.json`

## Notes
- CRM edits are kept in browser local storage, not written back into the original lead export.
- This keeps the original research data separate from workflow state.
