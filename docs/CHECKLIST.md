# Organization Checklist — Done vs Next

## DONE (this organization pass)

- [x] Full repository audit
- [x] Project map (`docs/PROJECT_MAP.md`)
- [x] Architecture, database, payments, vendors, notifications, commerce, auth, automation docs
- [x] n8n folder: documentation/, payloads/, examples/
- [x] Root README as documentation index
- [x] No UI, schema, RLS, or business-logic changes
- [x] No moves of working app routes (URLs/imports preserved)

## NEXT (recommended — not implemented here)

- [ ] Ensure migrations 006–008 applied on your Supabase project
- [ ] Configure `N8N_WEBHOOK_URL` + import workflow
- [ ] Resend/SMTP for production email
- [ ] Paystack production webhook
- [ ] Google Sheets ID for sales log
- [ ] Optional: checkout PICKUP UI, per-vendor n8n emails, stricter image storage paths
- [ ] CI: `npm run build` / lint
- [ ] Smoke test customer / vendor / admin / staff / payments

## Do not without explicit approval

Rebuild UI · rename tables · edit old migrations · weaken RLS
