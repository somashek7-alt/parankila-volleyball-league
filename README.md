# Parankila Volleyball League (PVL)

A one-time, fixture-specific volleyball league scoreboard. It includes the five supplied teams, their rosters, the ten supplied round-robin fixtures, an organizer dashboard, and a public spectator screen.

## Included

- `/admin` — private organizer dashboard (PIN protected after deployment)
- `/live` — public read-only scoreboard
- Manual set entry: enter any number of completed sets (up to five); no standard rally-point score is imposed
- Match winner is derived from sets won; the number of sets required to win is configurable in the league settings as a reference for the organizer
- Custom league-table points for wins and losses
- Standings: played, wins, losses, sets for/against, set difference and points
- Team rosters and logo crops taken from the supplied fixture image
- Original fixture reference displayed on the guest page
- Automatic guest-screen refresh every 2.5 seconds
- Cloudflare Pages Functions + D1 persistence

## Local preview

Serve the `public` directory with a local static server (for example, `python -m http.server 8000 --directory public`) and open that local address. If the API is unavailable, the app automatically uses browser-local demo data. Demo PIN: `1234`. Local mode is only a preview: its data does not sync across devices.

## Deploy to Cloudflare

1. Create a Cloudflare D1 database named `pvl-league`.
2. Copy the database ID into `wrangler.toml`.
3. Apply the schema: `npx wrangler d1 execute pvl-league --remote --file=./schema.sql`.
4. Create a Cloudflare Pages project and connect this repository, or deploy with Wrangler Pages.
5. Set the Pages build output directory to `public` (no build command required).
6. Add these Pages environment variables/secrets for Production:
   - `ADMIN_PIN` — choose a private organizer PIN.
   - `SESSION_SECRET` — a long random secret (at least 32 characters).
7. Add the D1 binding named `DB` and select the `pvl-league` database in Pages > Settings > Functions.
8. Deploy. Open `/admin`, sign in with the configured PIN, and share `/live` with spectators.

For CLI deployment, authenticate Wrangler first, then use `npx wrangler pages deploy public --project-name=parankila-volleyball-league`. Ensure the D1 binding and secrets are configured on the Pages project before using the admin dashboard.

## Notes

- The fixture image does not provide match dates, times, or venue, so those fields are intentionally left blank and can be entered by the organizer.
- Logo crops are extracted from the supplied fixture image; they are not vector/high-resolution official logo files.
- Guest refresh is near-live polling (2.5 seconds), chosen to keep this one-time app simple and within a low-cost Cloudflare architecture. It does not require Durable Objects.
- Cloudflare free-tier quotas and product terms can change; check current Cloudflare limits before public use.
- ECC (https://github.com/affaan-m/ECC) is an agent-engineering workflow reference, not a runtime dependency of this app. This project keeps the deployed application independent of ECC.
