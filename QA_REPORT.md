# Drishti product refinement and adversarial QA

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