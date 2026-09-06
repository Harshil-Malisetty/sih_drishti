# Drishti — Mobile Urban Intelligence

A mobile-first SIH frontend prototype that turns public transport fleets into moving city sensors. It includes navigable Police, Municipal and Citizen experiences powered by centralized structured demo data.

## Run

1. `npm install`
2. `npm run dev`
3. Open the local URL; use browser device mode at 390 × 844 for the intended presentation.
4. `npm run build` validates the production build.

## Structure

- `src/components` shared application UI, cards and GIS-style map
- `src/data/demo` centralized simulated Chennai data
- `src/navigation` role navigation configuration
- `src/services` future API boundary (currently returns demo data)
- `src/types` shared data contracts
- `src/pages` role pages
- `backend/README.md` planned backend architecture and endpoint contracts

Operational records are simulated demonstration data. All bundled evidence images and dashboard thumbnails are **real sourced photographs**, stored locally with attribution and reuse licences. They are not captures of the fictional records. No live surveillance or inference service is connected.

## Indian reference photos

- All 53 bundled photo assets are taken in **India**. Locations are checked against original source captions/categories, not an Indian brand name or photographer nationality. The original compact screens, timelines and workflows are retained; there are no documentary galleries.
- Full credits, original dates and reference-photo limitations are inside the closed **Photo credits** disclosure and [public/evidence/credits.html](public/evidence/credits.html). The timeline remains demo data; photos are not claimed to prove a single site's progression or identify pictured people/vehicles as actual matches.
- [scripts/real-photo-selections.mjs](scripts/real-photo-selections.mjs) lists every selected photo and its Indian-location evidence. Run `node scripts/source-real-evidence.mjs` to stage photos in `/tmp/drishti-indian-photos/`; review them before using `--publish`. Publishing replaces the complete catalogue, synchronizes both manifests/credits, and removes retired photo files rather than retaining foreign leftovers.
- The source register in [public/evidence/image-sources.json](public/evidence/image-sources.json) records location, source categories, author, licence, source URL and checksum. No generated-image fallback exists.

## Shared demo foundation

- `src/data/demo/index.ts` contains seed inputs only. `citySeed.ts` links them to canonical roads, road segments, departments and teams.
- `src/domain/cityStore.ts` provides atomic, guarded commands and immutable snapshots. `src/services/city.ts` owns the single browser-session instance; `useCityData` subscribes React to that instance.
- `src/domain/selectors.ts` derives Police summaries/assignments, Municipal records, and public Citizen context. Screens do not maintain separate operational copies.
- Existing Police assignment and watchlist actions write through the service layer. Existing planning runs now save a scenario and draft project; running a simulation does **not** publish a closure.
- Assignment, field resolution, admin review, traffic-anomaly dispatch and project approval are implemented in the role interfaces and backed by the shared service layer.
- Scenario inputs/results are immutable snapshots. Only approved projects inside their publication/validity windows influence Citizen context. Closed route legs return unavailable estimates, not fabricated travel times.
- On first workspace entry (including a restored role), historical demo timestamps are anchored to the current time. Existing event ages and ordering are preserved; new actions use the browser clock, with a millisecond tie-break for simultaneous commands—not artificial minute jumps. Display times use **Asia/Kolkata**. Role switches retain the shared session; reload starts a fresh demo. There are no random traffic spikes or real live fleet measurements. Tests can inject a deterministic clock.
- Operational screens use four visible stages. Municipal admins confirm and assign, field teams accept and work, then admins check the submission and approve/close or return it. Police retains team departure, arrival, follow-up traffic checks and a separate supervisor review. Routine handoffs are committed atomically; every original command, validation, and audit entry is preserved.
- State survives workspace exit/re-entry in the same page. **Reload intentionally restores the seed**; `demoService.reset()` does the same. Durable/cross-tab persistence is not implemented. Existing page stacks and GIS selection/camera state remain UI-local.
- Role entry shows a read-only fictional identity (POLICE-204, MUNICIPAL-118 or CITIZEN-032) and explicitly opens a demo workspace without credentials. It is not authentication. Citizen selectors redact internal source/team/watchlist fields; this is not a production security boundary because the browser still contains fictional Police records.

## Citizen journeys and reports

- Citizen opens a Leaflet map with source/destination selectors, current-location support, selectable routes and only journey-relevant road conditions. Map, Routes and On route are shortcuts within the same persistent journey, not separate dashboards.
- The Teynampet → Guindy demonstration uses two saved OSRM/OpenStreetMap road-network routes. Other supported Chennai landmark pairs, reverse journeys and current-location journeys request the public OSRM service on demand. No arbitrary-address geocoding or turn-by-turn guidance is implemented.
- Travel estimates are road-network baselines plus matched municipal planning delays, **not live traffic predictions**. Savings are calculated only between available candidates for the same endpoints. Closed candidates have no ETA. Corridor links and a 120 m proximity check provide approximate sampled coverage, not comprehensive street-level closure enforcement.
- Online route requests send the selected coordinates to routing.openstreetmap.de. Location is requested only after an explicit user action. Basemap tiles use OpenStreetMap; the saved demo routes and local evidence remain available without routing service access.
- Report a road issue requires a supported corridor and a 10–1000-character description; **photos are optional**. Attached JPEG/PNG/WebP images are decoded, resized and stripped of metadata. Successful submission replaces the form with a focused receipt containing the report ID and destination inbox.
- Category determines the recipient: potholes, waterlogging and road debris/damaged infrastructure go to Municipal; traffic obstruction/unsafe parking goes to Police. Both inboxes read the same session store. Municipal triage can dismiss a report or create a linked issue for assessment. Qualification, departmental assignment, resolution, admin verification and closure remain separate guarded actions.
- Police triage creates a Citizen-origin incident, not a fabricated fleet detection. Explicit officer assessment/assignment publishes a generic road warning; officer clearance removes it. Reporter descriptions/photos and Police investigation fields are not part of public Citizen conditions. Wrong-workspace triage is rejected by the demo command layer, not by real authentication.
- Reports remain **in memory only**, without an upload backend or external municipal delivery. Reload clears them. A production deployment needs authenticated APIs, durable evidence storage, moderation and privacy controls.
- Actions use one restrained, dismissible feedback message: green for successful verification/resolution, light blue for assignment/progress, neutral for dismissal/return and red for errors.

## Validation

- `npm run typecheck` — no-emit application TypeScript check.
- `npm test` — domain/service regression tests (Vitest).
- `npm run build` — TypeScript and production Vite build.

Tests cover shared identities, lifecycle guards, return-for-action, public verification gating, dispatch normalization, project approval/expiry/cancellation, scenario snapshots, route unavailability, subscriptions and reset.

## Next stage

Connect authenticated APIs and durable report/evidence storage, provision production routing and offline tiles, implement evidence authorization/audit and moderation, and ingest signed edge-event payloads. Evidence assets in this prototype are local. See [QA_REPORT.md](QA_REPORT.md) for executed tests and remaining limitations.