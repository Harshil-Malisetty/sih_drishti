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

All records are simulated demonstration data. Evidence assets are local illustrative fixtures. No live surveillance or inference service is connected.

## Shared demo foundation

- `src/data/demo/index.ts` contains seed inputs only. `citySeed.ts` links them to canonical roads, road segments, departments and teams.
- `src/domain/cityStore.ts` provides atomic, guarded commands and immutable snapshots. `src/services/city.ts` owns the single browser-session instance; `useCityData` subscribes React to that instance.
- `src/domain/selectors.ts` derives Police summaries/assignments, Municipal records, and public Citizen context. Screens do not maintain separate operational copies.
- Existing Police assignment and watchlist actions write through the service layer. Existing planning runs now save a scenario and draft project; running a simulation does **not** publish a closure.
- Assignment, field resolution, admin review, traffic-anomaly dispatch and project approval are implemented in the role interfaces and backed by the shared service layer.
- Scenario inputs/results are immutable snapshots. Only approved projects inside their publication/validity windows influence Citizen context. Closed route legs return unavailable estimates, not fabricated travel times.
- The demo starts at **5 September 2026, 18:55 Asia/Kolkata**. Commands advance a logical clock by one minute; screen navigation does not advance it. There are no wall-clock operational counters or random traffic spikes.
- State survives workspace exit/re-entry in the same page. **Reload intentionally restores the seed**; `demoService.reset()` does the same. Durable/cross-tab persistence is not implemented. Existing page stacks and GIS selection/camera state remain UI-local.
- Role entry explicitly opens a demo workspace without credentials. It is not authentication. Citizen selectors redact internal source/team/watchlist fields; this is not a production security boundary because the browser still contains synthetic Police fixtures.

## Citizen journeys and reports

- Citizen opens a Leaflet map with source/destination selectors, current-location support, selectable routes and only journey-relevant road conditions. Map, Routes and On route are shortcuts within the same persistent journey, not separate dashboards.
- The Teynampet → Guindy demonstration uses two saved OSRM/OpenStreetMap road-network routes. Other supported Chennai landmark pairs, reverse journeys and current-location journeys request the public OSRM service on demand. No arbitrary-address geocoding or turn-by-turn guidance is implemented.
- Travel estimates are road-network baselines plus matched municipal planning delays, **not live traffic predictions**. Savings are calculated only between available candidates for the same endpoints. Closed candidates have no ETA. Corridor links and a 120 m proximity check provide approximate sampled coverage, not comprehensive street-level closure enforcement.
- Online route requests send the selected coordinates to routing.openstreetmap.de. Location is requested only after an explicit user action. Basemap tiles use OpenStreetMap; the saved demo routes and local evidence remain available without routing service access.
- The camera action accepts JPEG/PNG/WebP photos, decodes and resizes them, strips metadata, and submits a report to the same session's municipal inbox. Municipal triage can dismiss it or create a linked issue for assessment. Qualification, departmental assignment, resolution, admin verification and closure remain separate guarded actions.
- Reports remain **in memory only**, without an upload backend or external municipal delivery. Reload clears them. A production deployment needs authenticated APIs, durable evidence storage, moderation and privacy controls.
- Actions use one restrained, dismissible feedback message: green for successful verification/resolution, light blue for assignment/progress, neutral for dismissal/return and red for errors.

## Validation

- `npm run typecheck` — no-emit application TypeScript check.
- `npm test` — domain/service regression tests (Vitest).
- `npm run build` — TypeScript and production Vite build.

Tests cover shared identities, lifecycle guards, return-for-action, public verification gating, dispatch normalization, project approval/expiry/cancellation, scenario snapshots, route unavailability, subscriptions and reset.

## Next stage

Connect authenticated APIs and durable report/evidence storage, provision production routing and offline tiles, implement evidence authorization/audit and moderation, and ingest signed edge-event payloads. Evidence assets in this prototype are local. See [QA_REPORT.md](QA_REPORT.md) for executed tests and remaining limitations.