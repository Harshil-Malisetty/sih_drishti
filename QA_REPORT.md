# Automatic nearest-station emergency allocation

Date: 7 September 2026. Current pass; earlier reports below are historical.

- Both Police and Municipal emergency entry points use one **Activate emergency response** action. The shared command immediately saves an assigned station; there is no pending request, reason form, manual team picker or second dispatch action. The notification names the allocated station.
- Selection uses Haversine distance from the event to all configured demo stations, with stable ID tie-breaking. Invalid coordinates or an empty valid directory reject atomically. Repeated/concurrent requests reuse the original allocation. Normal investigation and Municipal repair assignments are unchanged.
- **250 tests across 18 files passed**, including 13 new nearest-selection, atomicity, receipt, eligibility, timestamp and shared-panel tests. Production build, no-emit TypeScript and whitespace checks passed.
- Production-preview browser checks: Police collision → Teynampet Police Station (1.80 km); qualified Municipal waterlogging → Velachery Police Station (0.09 km). Both displayed station-specific notifications and stayed at Assigned, without pretending the team had departed. Double-clicking Municipal activation produced a single allocation with two audit entries, no remaining activation button or emergency team picker. The 390×844 emergency panel had no horizontal overflow; its screenshot was reviewed.
- Demo limitations: station names/coordinates are illustrative, not a verified emergency directory; distances are straight-line estimates, not travel times. Allocation represents a station response desk, not reservation of an individual field unit. No real emergency service is contacted. Progress/discharge and Municipal repair review remain separate. Reload resets demo state.
- No dependencies added, commit/push or deployment performed.

---

# Historical: Police jurisdiction filtering and focused civic UI refinement

Date: 7 September 2026. Historical pass.

- Police jurisdiction selection applies across overview totals/activity, incident queues, traffic control, citizen intake, both watchlist categories, maps and details. The choice is retained in session storage; changing it closes stale details and restores keyboard focus to the selector. Citywide remains available.
- The five areas are **demo corridor groupings, not official police boundaries or access controls**. Ownership is explicit by road segment. Watchlist ownership follows the latest sighting, never a source bus's current position; earlier out-of-area sightings remain labelled investigation context. Shared operational records and citywide team availability remain intact.
- Focused follow-up: replaced the rounded jurisdiction banner with a flat typographic heading and rules. Removed icons, duplicated area summaries, operational-area counts and demo metadata from this section. The compact native selector uses an underlined treatment; selected areas show useful corridor coverage. Surrounding cards were not redesigned in this follow-up.
- **237 tests across 17 files passed**, plus production build/TypeScript and whitespace checks.
- Independent Chrome visual checks at **375×844, 390×844, 393×844 and 1440×1000**, for both citywide and selected-area views: no document/section overflow; 44px selector target; no section icons, gradients, shadows or rounded corners. Screenshots reviewed at all four widths.
- Browser checks across all six scopes verified incident counts, both watchlist tabs, reporting-fleet and active-incident marker counts, empty-map states, scope changes from details, Back-history guards, reload persistence and labelled cross-area history. No uncaught page errors in the checked flows.
- No dependencies added, commit/push or deployment performed.

---

# Historical: Drishti Indian photos and simple presentation

Date: 6 September 2026. Historical pass.

## Result

- All **53 bundled photo assets** now use photographs taken in India, verified using source descriptions and categories. Foreign images and retired gallery-only files were removed, not merely hidden.
- Removed documentary galleries, source-date panels, relationship badges and long visible explanations. Restored the original compact incident, watchlist, municipal-detail and lifecycle layouts. Credits and full provenance remain inside closed **Photo credits** disclosures.
- Photographs cover Chennai flooding/crossings, Bengaluru potholes, Kolkata collisions, Kerala maintenance, Tamil Nadu median damage, Uttarakhand barriers and other Indian references. Images illustrate the relevant category; scenario dates and states are not claims about a real same-site photographic sequence.
- Preserved the manual landing-title edit, photo thumbnails, four-step workflows, map navigation, session times and citizen-upload handling. No synthetic image generation was reintroduced.

## Checks

- **212 tests across 14 files passed**, plus typecheck, production build and whitespace validation.
- Asset audit: **53 India-tagged photos, 0 foreign entries**, matching source-location evidence, decodable WebP files, bounded sizes, matching hashes and synchronized credits.
- Browser checks at **1280×900 and 390×844**: compact layouts, all six original lifecycle selections, Indian incident photo loading, preserved municipal assignment action, closed credit disclosures and no visible source-date panels or documentary galleries. No horizontal overflow in checked layouts.
- Changes are local in this pass; no commit, push or Vercel deployment was performed.

---

# Historical: workflow, fleet and session-time update

Date: 6 September 2026. This preceding workflow pass is retained as historical evidence.

## Current changes

- Landing headline: “A clearer view of our roads.” Removed the redundant Police / Municipal / Citizens audience row.
- First workspace entry anchors historical events to the session time, including restored-role entry. New actions use their actual execution time with a millisecond ordering tie-break. Role switches preserve work; reload creates a fresh session. Historical ages stay intact, planned future windows remain future, and demo data is not represented as live telemetry.
- Police map shows all **10 reporting buses**, matching its banner, including separately selectable co-located buses.
- Municipal work uses **Assign team → Fix issue → Admin check → Done**. Police response uses **Send team → Respond → Supervisor → Done**. Combined actions are atomic, keep original audit records, and retain separate field submission and independent review/rework stages.
- Plain-language explanations and current ownership replace prominent baseline ratios and repeated status fields. Evidence and full activity logs remain available in disclosures.
- Dashboard event rows use decorative category SVG scenes; actual evidence/photos remain in details with provenance. Removed the municipal fleet observation coverage bar chart, not the planning chart.
- Citizen receipts and departmental report inboxes show submission times.

## Validation

- Typecheck, production build and whitespace checks passed.
- **176 tests across 14 files passed**, covering session/year boundaries, real-time commands, fleet parity, dashboard artwork, timestamp formatting, atomic handoffs, review returns, evidence retention, emergency guards and workflow presentation.
- Production-preview browser checks at desktop and **390×844**: landing copy/audience removal; all 10 fleet markers selectable by keyboard; police full response including follow-up and returned review; municipal full repair including returned review; both approval/closure paths; role-switch persistence; citizen route receives the police follow-up; citizen no-photo report/receipt. No horizontal overflow or visible workflow errors in those checks.
- This remains a simulated, in-memory demo. Real staff authentication, live bus feeds and persistent operational storage are not introduced.

---

# Historical: final polish and functional-integrity pass

Date: 5 September 2026. This section records a **previous pass** and is retained as historical evidence, not as newly executed coverage.

## Current result

- `npm run typecheck`: **PASS**.
- `npm test`: **82 tests passed across 8 files** (11 new service-level regression cases).
- `npm run build`: **PASS**, no oversized-chunk warning.
- `git diff --check`: **PASS**.
- Production-preview browser checks: no console errors or uncaught page errors in the post-fix run. One Leaflet zoom/unmount race was reproduced earlier, fixed and retested.
- No dependencies added or upgraded. No commit or push performed.

## 1. Files changed in this pass

| Area | Files |
|---|---|
| Entry and shared presentation | [src/App.tsx](src/App.tsx), [src/styles-refinement.css](src/styles-refinement.css), [src/components/cards.tsx](src/components/cards.tsx) |
| Report UI and role integration | [src/components/CitizenReports.tsx](src/components/CitizenReports.tsx), [src/pages/CitizenPages.tsx](src/pages/CitizenPages.tsx), [src/pages/MunicipalOperations.tsx](src/pages/MunicipalOperations.tsx), [src/pages/PolicePages.tsx](src/pages/PolicePages.tsx) |
| Shared routing, commands and public projections | [src/domain/citizenReports.ts](src/domain/citizenReports.ts) (new), [src/domain/cityStore.ts](src/domain/cityStore.ts), [src/domain/selectors.ts](src/domain/selectors.ts), [src/services/index.ts](src/services/index.ts), [src/types/city.ts](src/types/city.ts), [src/types/index.ts](src/types/index.ts) |
| Minimal map race fix | [src/components/CitizenMapView.tsx](src/components/CitizenMapView.tsx), [src/components/MunicipalMapView.tsx](src/components/MunicipalMapView.tsx), [src/components/PoliceMapView.tsx](src/components/PoliceMapView.tsx); planner constructor in MunicipalOperations above |
| Regression tests | [tests/citizen-submission.test.ts](tests/citizen-submission.test.ts) (new), [tests/helpers.ts](tests/helpers.ts) |
| Documentation | [README.md](README.md), [backend/README.md](backend/README.md), [QA_REPORT.md](QA_REPORT.md) |

## 2. Citizen submission root cause and fix

**Reproduced before editing:** with a valid description and corridor but no photo, native form validity was true while Submit remained disabled. The form required `image` in its button guard; the command also rejected empty/missing images. This contradicted the intended optional-photo workflow. The shared store and Municipal handoff were already present, not the cause of this blocker.

- Photo is optional in the input contract, command and form. Invalid attached formats still fail validation; the user can remove them and submit without a photo.
- A successful command replaces the form with a distinctly titled receipt. Focus and dialog scroll move to the receipt heading; it includes ID, road, category, recipient and photo state. Done/Escape returns to the journey and restores opener focus.
- All supported road geometry is available, independent of construction-planning eligibility. No unrelated corridor is silently selected when the current route has no known road segment.
- Accepted no-photo records have honest text-only evidence states, not broken images or invented photographs.
- Submission fields are whitelisted. Existing duplicate-submit protection is preserved; browser double-click produced one report.

## 3. Shared propagation and deterministic routing

One immutable `cityStore` remains the source of truth. Role logout/re-entry in the same tab does not reset it. No Citizen-only report list, backend, new cache or persistence layer was added.

| Report category | Inbox | Accepted record and continuation |
|---|---|---|
| Pothole | Municipal | Roads / Engineering issue |
| Waterlogging | Municipal | Stormwater issue |
| Road debris / damaged infrastructure (`obstruction`) | Municipal | Roads / Engineering issue |
| Traffic obstruction / unsafe parking (`traffic-obstruction`) | Police | Citizen-origin incident → explicit assessment & investigation assignment → officer clearance |

Both inboxes filter the same report table. Wrong-workspace triage is rejected. Accepted records retain reciprocal `citizenReportId` links; dismissal creates no operational record. Municipal issues require explicit qualification before assignment/publication and continue through the existing departmental repair/review/closure workflow. Police reports never gain fake bus sightings, registration extraction or model confidence. Police intake acceptance alone does not publish a warning: explicit assessment/assignment is required. Clearance removes the active warning. Public conditions use generic category summaries, not reporter text/photos or investigation details.

## 4. Demo entry, landing and visual consistency

- Kept the existing logo, identity, role palettes and role separation.
- Restored a product-like demo entry with read-only fictional identities: POLICE-204, MUNICIPAL-118, CITIZEN-032; selected role and a single entry action. Explicitly states there is no real authentication.
- Preserved “One fleet. A city of insights.” and the AI-Powered Mobile Urban Intelligence identity; added “Every bus becomes an intelligent moving sensor for the city.”
- Clarified Bus cameras → Edge AI → City intelligence → role audiences. Improved mobile spacing and supporting text; restored a deliberate two-column desktop composition instead of inherited/conflicting layout rules.
- Aligned report receipts, inbox rows and no-photo states. Police stays operational, Municipal workflow-oriented and Citizen map/mobility-first. No gradient, glow, glass treatment or oversized decorative cards were added.

## 5. Motion and map stability

Reviewed the [official Motion for React documentation](https://motion.dev/docs/react), including its recommendation to use CSS for simple self-contained effects. Motion was already installed and remains in the existing Bklit charts. **No new Motion React usage or dependency** was needed.

New effects are CSS only: 180 ms, 4 px entrance on the landing hero, demo-entry panel and report receipt; 140 ms role-card/button colour/border transitions. Reduced-motion preference disables these effects. No looping pipeline, staggered dashboard animations or scale effects were added.

Rapid Police zoom → layer switch exposed Leaflet 1.9's pending zoom-transition callback accessing a removed map (`_leaflet_pos`). The minimal fix sets the public `zoomAnimation: false` option on all four map constructors. No map implementation was rewritten. Zoom, pan, route geometry, marker selection, sheets and saved camera state remain. Rapid zoom/filter/detail/Back and planner/Citizen unmount sequences were retested without runtime errors.

## 6. Automated and browser regression results

All existing seven Vitest suites still pass. New coverage verifies optional images, exact shared receipts, all four category destinations, wrong-role rejection, reciprocal record links, qualification guards, Police clearance/public-warning gating, public-description redaction, detached reads, injected-field stripping, concurrent receipts, non-planning roads, duplicate triage, queue capacity/retry and missing geometry.

Browser: integrated Chromium against compiled production preview, with viewports **375×812, 390×844, 393×852, 1440×1000**. These are not four physical devices.

| Check actually executed in this pass | Coverage / result |
|---|---|
| Landing, all three role entries and workspace rendering | All four sizes; pass |
| Citizen report → receipt → same exact Municipal report → accepted linked issue | All four sizes; pass. Real local JPEG attachment at 390; no-photo at other sizes |
| Full linked Municipal qualification → assignment → acknowledgement → field action → resolution → admin verification → closure | 375; pass, repeated on final build |
| Citizen traffic report → Police inbox → acceptance → assignment → officer clearance | 375; pass |
| Planner 3-day closure → approval → Citizen closed candidate/alternative → work detail | 375; pass, repeated on final build |
| Citizen route selection, geographic paths, map pan/zoom/fit, public-only visible fields | All four sizes; pass |
| Current-location → live OSRM geographic routes | 393; emulated GPS fix, real network request; 6.9/7.0 km alternatives returned. Location-denial recovery also passed |
| Existing collision evidence/timeline → investigation assignment → Back | 1440; pass |
| Watchlist evidence and selected multi-bus movement trail | All four sizes; pass. Human verification action also passed |
| Existing fleet traffic anomaly → dispatch → assignment → en route → on scene → follow-up → resolution → verification → closure | 390; pass |
| Police and Municipal map pan/zoom → record → Back camera retention | All four sizes; marker-position difference within 2 px, usable zoom controls |
| Post-fix rapid Police zoom/layer switching and immediate record navigation | All four sizes; pass, no repeat of teardown error |
| Municipal GIS layer changes, planner zoom/Back and Citizen zoom/logout | Pass on final build |
| Existing Bklit pothole progression/evidence selection and data table | 375; five-row table and selection passed |
| CDP-dispatched touch swipes over lifecycle chart | 375, 390, 393; page scrolled; `pan-y pinch-zoom` preserved |
| Keyboard role entry, Back, dialog Escape/opener focus, reduced motion | Pass |
| Whitespace-only description, rejected SVG attachment/removal, retry and double-click submission | Pass; one report, focused receipt |
| Document/container overflow, targeted clipped controls/text and broken loaded evidence images | No failures in the audited screens |

Final build: entry JS **212.14 kB / 67.35 kB gzip**; largest lazy chunk **334.99 kB / 108.41 kB gzip**. Existing evidence JPEG unchanged at 408.83 kB.

## 7. Runtime results and limitations

- **Zero captured console errors / uncaught page errors after the map fix.** Earlier captured Leaflet error is described above, not hidden. Aborted tile requests during rapid map teardown are normal cancellations, not a claim of offline support.
- GPS success/denial used emulated browser callbacks because the integrated browser did not support native permission emulation. The successful online route was not mocked. Real GPS hardware, physical capture sheets, iOS/Android safe areas, Safari/Firefox and screen readers were not tested.
- Demo identities are presentation only. Role guards and public projections are useful frontend structure, **not a production authorization boundary**; synthetic Police fixtures still exist in the client bundle. Existing security architecture notes are preserved.
- Reports/operations exist only in the loaded tab and reset on reload. No external Municipal/Police delivery, synchronization, real emergency dispatch or durable receipt lookup exists.
- Pending reports are capped at 20. This is not a production retention/storage policy; long demo sessions with many accepted photos still consume browser memory.
- Routing still supports the existing named Chennai landmarks/current location, sampled corridor coverage and external OSRM/OpenStreetMap services. No address geocoder, guaranteed street-level closure avoidance, live ETA, offline tiles or turn-by-turn guidance was added.
- Browser checks were executed interactively with Playwright; no new Playwright dependency or CI browser runner was added. No comprehensive accessibility certification is claimed.

---

# Previous refinement report (historical)

Date: 5 September 2026. Scope: the existing SIH demo, not a production deployment.

## 1. Files changed

### Application and shared presentation
- [src/App.tsx](src/App.tsx), [src/main.tsx](src/main.tsx), [src/navigation/config.ts](src/navigation/config.ts)
- [src/components/ui.tsx](src/components/ui.tsx), [src/components/cards.tsx](src/components/cards.tsx), [src/components/MapView.tsx](src/components/MapView.tsx)
- [src/components/ActionFeedback.tsx](src/components/ActionFeedback.tsx), [src/components/operations.tsx](src/components/operations.tsx)
- [src/styles.css](src/styles.css), [src/styles-refinement.css](src/styles-refinement.css), [src/styles-citizen.css](src/styles-citizen.css)

### Role interfaces
- [src/pages/PolicePages.tsx](src/pages/PolicePages.tsx), [src/pages/MunicipalOperations.tsx](src/pages/MunicipalOperations.tsx), [src/pages/CitizenPages.tsx](src/pages/CitizenPages.tsx)
- [src/components/PoliceTrafficControl.tsx](src/components/PoliceTrafficControl.tsx), [src/components/EmergencyDispatchPanel.tsx](src/components/EmergencyDispatchPanel.tsx)
- [src/components/MunicipalWorkflow.tsx](src/components/MunicipalWorkflow.tsx), [src/components/ProjectApproval.tsx](src/components/ProjectApproval.tsx)
- [src/components/PoliceMapView.tsx](src/components/PoliceMapView.tsx), [src/components/MunicipalMapView.tsx](src/components/MunicipalMapView.tsx), [src/components/CitizenMapView.tsx](src/components/CitizenMapView.tsx)
- [src/components/CitizenReports.tsx](src/components/CitizenReports.tsx)
- Removed the superseded Citizen project-context component and the unused schematic-map implementation. The shared Police bottom sheet remains.

### Charts, domain, services and validation
- [src/components/PotholeLifecycle.tsx](src/components/PotholeLifecycle.tsx), [src/components/charts/use-chart-interaction.ts](src/components/charts/use-chart-interaction.ts)
- [src/types/city.ts](src/types/city.ts), [src/domain/cityStore.ts](src/domain/cityStore.ts), [src/domain/operations.ts](src/domain/operations.ts), [src/domain/selectors.ts](src/domain/selectors.ts), [src/domain/citizenJourney.ts](src/domain/citizenJourney.ts)
- [src/data/demo/citySeed.ts](src/data/demo/citySeed.ts), [src/data/demo/operations.ts](src/data/demo/operations.ts)
- [src/services/index.ts](src/services/index.ts), [src/services/journey.ts](src/services/journey.ts)
- [tests/citizen-product.test.ts](tests/citizen-product.test.ts), [.vscode/tasks.json](.vscode/tasks.json)
- [README.md](README.md), [backend/README.md](backend/README.md), this report.

## 2. Shared components changed

- One application-wide action-feedback provider. Green success/verification; pale blue assignment/progress; neutral dismissal/return; red errors. One message at a time, dismissible, announced politely, and pointer-transparent except its close button.
- Shared mutation handling keeps pending guards and errors, with action-specific confirmation text.
- Native modal dialogs contain keyboard focus, support Escape and restore focus. Shared filters expose pressed state; common focus rings, form sizing and restrained surfaces are aligned.
- Operational detail stacks now restore their saved entries on Back/Forward instead of treating both directions as a blind pop.

## 3. Data model changes

- Added `CitizenReportInput`, `CitizenReport`, `CityState.citizenReports`, `MunicipalIssue.citizenReportId`, and the obstruction issue kind.
- Report submission validates supported location/category, description length and bounded image format. Acceptance creates a linked Detected issue without invented bus sightings. Qualification gates public publication; verified repairs disappear from active journey warnings.
- Added geographic journey/place/route contracts, saved road-network geometries and a pure route-context evaluator. Existing operational state remains in one store.
- No database, authentication, server endpoints or durable persistence were added.

## 4. New workflows

- Citizen: source/destination or current location → route request → selectable geographic alternatives → relevant conditions and municipal work.
- Citizen: camera/file → image preview and confirmed corridor → report receipt → municipal inbox → acceptance/dismissal → existing assessment and repair lifecycle.
- Existing Police dispatch, investigation, watchlist and Municipal approval/review workflows are retained, not replaced.

## 5. Cross-role integrations

- Approved Anna Salai planning closure makes the matching Citizen candidate unavailable and retains an alternative; matched diversion delays contribute to its estimate.
- Police traffic qualification/dispatch stays linked to the original fleet observation and comparison window. Resolution verification still requires a later normalizing observation.
- Municipal field resolution creates the admin-review task; verification and closure remain separate. Citizen road-condition publication uses the same reviewed state.
- Citizen reports reach Municipal within the same browser session. They are not automatically authoritative road closures.

## 6. Bklit components

Preserved the Municipal coverage bar chart, condition/lifecycle line chart and planning-impact line chart. Added accessible data tables, corrected chart theme variable aliases, allowed vertical touch scrolling and removed hover-only evidence selection. Fractional scenario dates no longer collapse; displayed day labels are rounded instead of exposing floating-point artifacts. Severity is labelled an illustrative index, not a measured damage percentage.

## 7. UI problems fixed

- Restrained landing hierarchy and processing explanation; removed decorative orbit/network filler and fake credential entry.
- Citizen is map/route-first rather than a municipal-style dashboard. Citywide alert stacks and arbitrary schematic road lines are removed.
- Dispatch state, responsible team, latest action and next action are prominent; supporting evidence remains accessible.
- Corrected misleading admin-review counts, returned-work action flags, closed-issue badges, report provenance/dates and historical-baseline wording.
- Fixed Fleet shortcut selection, inert watchlist-trail selections, duplicate Citizen project presentation and passive endpoints incorrectly exposed as buttons.
- Role-level lazy loading prevents all map/chart code from loading on the landing screen.

## 8. Mobile problems fixed

- Shared important buttons/form controls target at least 44 px; mobile operational fields use 16 px text.
- Corrected segmented-control sizing, GIS filter/zoom hit-area collisions, toast interception of subsequent actions, and long-text reflow.
- Tested document **and application-container** overflow, evidence-image loading and bottom-sheet/navigation collisions at the matrix sizes below: no failures in the final core run.
- Police and Municipal zoom/pan → detail → Back retained marker position at all four sizes after animation settled. Planner approval no longer refits unchanged geometry.

## 9. Accessibility fixes and checks

- Text-labelled severity/status, visible focus styling, pressed filter states, keyboard GIS markers and a keyboard-selectable planning corridor.
- Dialog focus containment/Escape/focus restoration and invalid-photo submission guard tested in the browser.
- Accessible tables accompany the Bklit SVGs. Police timeline details no longer require hover.
- Actual CDP-dispatched touch sequences over the lifecycle chart scrolled the page at 375, 390 and 393 px.
- This was not a screen-reader certification or complete WCAG conformance audit. Physical iOS/Android camera, keyboard and safe-area behavior were not tested.

## 10. Build and performance result

- `npm run build`: passed; no oversized-chunk warning after role-level code splitting.
- Entry JavaScript: approximately 211 kB minified / 67 kB gzip. Largest lazy chunk: approximately 335 kB / 108 kB gzip.
- No package/dependency additions. The existing local evidence JPEG remains approximately 409 kB.
- `npm run typecheck`: passed. Additional TypeScript no-unused-locals/no-unused-parameters check: passed.
- `npm test`: **71 tests passed across 7 files**, including 12 new report/journey cases.
- Evidence/brand assets are local. OpenStreetMap basemaps and optional online routing remain external dependencies.

## 11. Console-error result

- Final core production-preview matrix: **zero captured console errors and zero uncaught page errors**. Subsequent planner camera checks were also error-free.
- A deliberately mocked routing HTTP 503 produced the expected browser resource error; the UI displayed a recoverable error and did not invent routes.
- Earlier development-server failures were diagnosed as stale configuration / an empty cached HMR transform. The source compiled correctly; final testing used a fresh production preview, not that server.
- Tile requests can be aborted normally when leaving a map. This is not evidence of offline basemap availability.

## 12. Whitespace result

`git diff --check`: passed.

## 13. End-to-end workflows actually executed

Browser: integrated Chromium, against the compiled Vite preview. These are viewport tests, not four physical devices.

| Workflow | 375 × 812 | 390 × 844 | 393 × 852 | 1440 × 1000 |
|---|---|---|---|---|
| Landing and role entry | Pass | Pass | Pass | Pass |
| Police anomaly → dispatch → assignment → en route → on scene → follow-up → resolution → verification → closure | Pass | Pass | Pass | Pass |
| Police incident → evidence/timeline → investigation assignment | Pass | Pass | Pass | Pass |
| Watchlist → multi-bus trail selection → human verification | Pass | Pass | Pass | Pass |
| Police GIS and Fleet shortcut; zoom/pan persistence | Pass | Pass | Pass | Pass |
| Municipal issue → qualification → assignment → acknowledgement → field work → resolution → admin task → verification → closure | Pass | Pass | Pass | Pass |
| Municipal GIS, lifecycle evidence and Bklit chart/data views | Pass | Pass | Pass | Pass |
| Planner → actual corridor selection → 3-day closure → what-if → approval | Pass | Pass | Pass | Pass |
| Citizen map → municipal work detail → better-route action → alternative | Pass | Pass | Pass | Pass |
| Citizen photo file → receipt → Municipal inbox → accepted linked issue | Pass | Pass | Pass | Pass |

Additional executed checks:
- Blue assignment, neutral return-for-action and green verification toast classes/backgrounds; resubmission after a returned resolution.
- Live Teynampet → Adyar routing and an emulated current-location → Adyar request.
- Mocked location denial/out-of-coverage; same-endpoint guard; mocked routing-service failure and saved-route recovery.
- SVG photo rejection, disabled submission, dialog keyboard containment/Escape and restored camera-button focus.
- A 1,000-character unbroken report through submission and municipal assessment: no dialog/detail horizontal overflow.
- Browser Forward restored a Municipal detail screen. Planner zoom/approval retained camera at every requested width.

The physical camera capture sheet, real GPS hardware, screen readers, Safari/Firefox, production emergency delivery and backend/API security were not tested.

## 14. Remaining limitations

1. Reports and operational changes are session-local and reset on reload. There is no actual municipal backend delivery, durable storage, cross-device synchronization or production authorization.
2. Citizen supports four named Chennai landmarks plus an explicitly requested current location, not arbitrary-address geocoding. The saved default route is deterministic; other journeys depend on a public routing service without a production SLA.
3. Route times are road-network estimates plus municipal planning delays, not live arrival predictions. Corridor matching/proximity and road-work geometry are sampled and approximate; closures are not guaranteed to be enforced at street/lane level. No turn-by-turn guidance is provided.
4. Camera uses the browser's native file/capture control. Production upload security, moderation, retention and consent policies are still required. Hardware capture was not exercised.
5. Basemap tiles need network access; no offline tile package was added. Existing planning-road samples and some historic GIS points remain illustrative.
6. No comprehensive accessibility certification or physical-device coverage is claimed.

Refinement stops here: no additional dashboards, animations or speculative features were added.