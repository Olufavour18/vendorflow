# Authentication & Roles

- Supabase Auth (password + email OTP)
- Session: `@supabase/ssr` + middleware
- Profile auto-created on signup

| Role | Access |
|------|--------|
| customer | Store, account, own orders/addresses |
| vendor | /vendor/* after registration |
| admin | /admin/* |
| warehouse / delivery / support | /staff |

Layers: UI redirects, RLS, API checks where needed.
